import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getGoogleOAuthClient } from '@/lib/googleClient';
import { saveIntegration } from '@/lib/integrations';
import { updateUserGoogleMetadata } from '@/lib/auth-service';
import { getAuthFromRequest } from '@/lib/auth-helpers';
import { ROLE_SERVICE_PROVIDER } from '@/src/constants/roles';
import {
  log_onboarding_activity,
  truncate_activity_reason,
} from '@/lib/user_auth_activity_log';

type oauth_state = {
  userId?: string;
  workspaceId?: number;
  linkedAuthUserId?: string | null;
  returnTo?: string;
};

function parse_oauth_state(state: string | null): oauth_state | null {
  if (!state) return null;
  try {
    return JSON.parse(Buffer.from(state, 'base64').toString()) as oauth_state;
  } catch {
    return null;
  }
}

function is_onboarding_return_to(path: string | undefined): boolean {
  if (!path || !path.startsWith('/')) return false;
  try {
    const u = new URL(path, 'http://local');
    return u.pathname === '/register' && u.searchParams.get('onboarding') === '1';
  } catch {
    return false;
  }
}

function resolve_return_to(decoded: oauth_state | null): string | undefined {
  const raw = decoded?.returnTo;
  return typeof raw === 'string' && raw.startsWith('/') ? raw : undefined;
}

function integrations_error_url(
  req: Request,
  errorCode: string,
  message?: string | null
): URL {
  const u = new URL(`/integrations?error=${encodeURIComponent(errorCode)}`, req.url);
  if (message) u.searchParams.set('message', message);
  return u;
}

function error_redirect_url(
  req: Request,
  returnTo: string | undefined,
  errorCode: string,
  message?: string | null
): URL {
  if (returnTo && is_onboarding_return_to(returnTo)) {
    const u = new URL(returnTo, req.url);
    u.searchParams.set('error', errorCode);
    if (message) u.searchParams.set('message', message);
    return u;
  }
  return integrations_error_url(req, errorCode, message);
}

async function log_onboarding_google_error(opts: {
  req: Request;
  userId?: string | null;
  workspaceId?: number | null;
  reason: string;
}): Promise<void> {
  const wid =
    opts.workspaceId != null && Number.isFinite(opts.workspaceId) && opts.workspaceId > 0
      ? opts.workspaceId
      : null;
  if (!opts.userId || !wid) return;
  await log_onboarding_activity({
    req: opts.req,
    user_id: opts.userId,
    workspace_id: wid,
    event_type: 'onboarding_error',
    reason: truncate_activity_reason(`Google Calendar: ${opts.reason}`),
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  const decodedState = parse_oauth_state(state);
  const stateReturnTo = resolve_return_to(decodedState);
  const stateUserId =
    typeof decodedState?.userId === 'string' ? decodedState.userId : null;
  const stateWorkspaceId =
    decodedState?.workspaceId != null && Number.isFinite(Number(decodedState.workspaceId))
      ? Number(decodedState.workspaceId)
      : null;

  try {
    // Handle OAuth errors from Google
    if (error) {
      console.error('Google OAuth error:', error, errorDescription);
      const errorMessage = errorDescription || error;
      if (is_onboarding_return_to(stateReturnTo)) {
        await log_onboarding_google_error({
          req,
          userId: stateUserId,
          workspaceId: stateWorkspaceId,
          reason: errorMessage,
        });
      }
      return NextResponse.redirect(
        error_redirect_url(req, stateReturnTo, 'oauth_error', errorMessage)
      );
    }

    if (!code || !state) {
      console.error('Missing OAuth parameters:', { code: !!code, state: !!state });
      if (is_onboarding_return_to(stateReturnTo)) {
        await log_onboarding_google_error({
          req,
          userId: stateUserId,
          workspaceId: stateWorkspaceId,
          reason: 'Missing OAuth parameters',
        });
      }
      return NextResponse.redirect(
        error_redirect_url(req, stateReturnTo, 'missing_params')
      );
    }

    let auth = await getAuthFromRequest(req);
    let stateLinkedAuthUserId: string | null | undefined;
    try {
      stateLinkedAuthUserId = decodedState?.linkedAuthUserId ?? null;
      if (!auth?.userId && decodedState?.userId) {
        auth = {
          userId: decodedState.userId,
          workspaceId:
            decodedState.workspaceId != null ? Number(decodedState.workspaceId) : null,
        };
      }
    } catch {
      if (!auth?.userId) {
        auth = { userId: state, workspaceId: null };
      }
    }
    if (!auth?.userId) {
      console.error('No user found');
      return NextResponse.redirect(
        error_redirect_url(req, stateReturnTo, 'unauthorized')
      );
    }
    if (!auth.workspaceId) {
      const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
      const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
      if (supabaseUrl && supabaseServiceKey) {
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        const { data } = await supabaseAdmin.auth.admin.getUserById(auth.userId);
        const wid = data?.user?.user_metadata?.workspace_id;
        if (wid != null) auth.workspaceId = Number(wid);
      }
    }
    if (!auth.workspaceId) {
      console.error('No workspace found');
      if (is_onboarding_return_to(stateReturnTo)) {
        await log_onboarding_google_error({
          req,
          userId: auth.userId,
          workspaceId: stateWorkspaceId,
          reason: 'No workspace found',
        });
      }
      return NextResponse.redirect(
        error_redirect_url(req, stateReturnTo, 'no_workspace')
      );
    }

    const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
    const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
    const supabaseAdmin =
      supabaseUrl && supabaseServiceKey
        ? createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false },
          })
        : null;

    // Construct redirect URI dynamically (must match the one used in connect route)
    const url = new URL(req.url);
    const baseUrl = `${url.protocol}//${url.host}`;
    const redirectUri = `${baseUrl}/api/integrations/google/callback`;

    // Validate environment variables
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.error('Google OAuth credentials not configured');
      if (is_onboarding_return_to(stateReturnTo)) {
        await log_onboarding_google_error({
          req,
          userId: auth.userId,
          workspaceId: auth.workspaceId,
          reason: 'Google OAuth not configured',
        });
      }
      return NextResponse.redirect(
        error_redirect_url(req, stateReturnTo, 'config_missing')
      );
    }

    const oauth2Client = getGoogleOAuthClient(redirectUri);

    try {
      const { tokens } = await oauth2Client.getToken(code);

      if (!tokens.access_token) {
        console.error('No access token received from Google');
        if (is_onboarding_return_to(stateReturnTo)) {
          await log_onboarding_google_error({
            req,
            userId: auth.userId,
            workspaceId: auth.workspaceId,
            reason: 'No access token received from Google',
          });
        }
        return NextResponse.redirect(
          error_redirect_url(req, stateReturnTo, 'no_token')
        );
      }

      // Fetch user info from Google (same as registration flow)
      let googleEmail: string | undefined;
      let googleId: string | undefined;
      try {
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        });
        if (userInfoRes.ok) {
          const userInfo = await userInfoRes.json();
          googleEmail = userInfo.email;
          googleId = userInfo.id;
        }
      } catch {
        // Non-critical; integration will still be saved
      }

      const metadata = { scope: tokens.scope, email: googleEmail };

      let linkedAuthUserId = stateLinkedAuthUserId ?? null;
      if (linkedAuthUserId == null && supabaseAdmin) {
        const { data: roleRow } = await supabaseAdmin.auth.admin.getUserById(auth.userId);
        const role = roleRow?.user?.user_metadata?.role as string | undefined;
        if (role === ROLE_SERVICE_PROVIDER) {
          linkedAuthUserId = auth.userId;
        }
      }

      const result = await saveIntegration({
        workspace_id: auth.workspaceId,
        type: 'google_calendar',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || undefined,
        expires_at: tokens.expiry_date ? Math.floor(tokens.expiry_date / 1000) : undefined,
        metadata,
        provider_user_id: googleId,
        linked_auth_user_id: linkedAuthUserId,
      });

      if (!result.ok) {
        console.error('Failed to save integration:', result.error);
        if (is_onboarding_return_to(stateReturnTo)) {
          await log_onboarding_google_error({
            req,
            userId: auth.userId,
            workspaceId: auth.workspaceId,
            reason: result.error || 'Failed to save integration',
          });
        }
        return NextResponse.redirect(
          error_redirect_url(
            req,
            stateReturnTo,
            'save_failed',
            result.error || null
          )
        );
      }

      if (supabaseAdmin) {
        await updateUserGoogleMetadata({
          userId: auth.userId,
          google_calendar_sync: true,
          google_id: googleId,
          google_email: googleEmail,
          supabaseAdmin,
        });
      }

      console.log('Google Calendar connected successfully for workspace:', auth.workspaceId);
      if (is_onboarding_return_to(stateReturnTo)) {
        await log_onboarding_activity({
          req,
          user_id: auth.userId,
          workspace_id: auth.workspaceId,
          event_type: 'onboarding_google_calendar',
          reason: 'Connected',
        });
      }
      const successUrl = stateReturnTo
        ? stateReturnTo
        : '/integrations?success=google_connected';
      return NextResponse.redirect(new URL(successUrl, req.url));
    } catch (tokenError: any) {
      console.error('Error exchanging code for token:', tokenError);
      // Check for specific Google OAuth errors
      if (tokenError.message?.includes('redirect_uri_mismatch')) {
        console.error('Redirect URI mismatch. Expected:', redirectUri);
        if (is_onboarding_return_to(stateReturnTo)) {
          await log_onboarding_google_error({
            req,
            userId: auth.userId,
            workspaceId: auth.workspaceId,
            reason: 'redirect_uri_mismatch',
          });
        }
        return NextResponse.redirect(
          error_redirect_url(req, stateReturnTo, 'redirect_uri_mismatch')
        );
      }
      throw tokenError;
    }
  } catch (error: any) {
    console.error('Google callback error:', error);
    const errorMessage = error.message || 'Unknown error occurred';
    if (is_onboarding_return_to(stateReturnTo)) {
      await log_onboarding_google_error({
        req,
        userId: stateUserId,
        workspaceId: stateWorkspaceId,
        reason: errorMessage,
      });
    }
    return NextResponse.redirect(
      error_redirect_url(req, stateReturnTo, 'callback_failed', errorMessage)
    );
  }
}
