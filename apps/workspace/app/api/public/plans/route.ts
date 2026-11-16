import { NextResponse } from 'next/server';
import type { plans } from '@app/db/subscription';
import {
  CLAIM_FREE_PLAN_SLUG,
  listActivePlans,
  UNLIMITED_BOOKING_LIMIT,
} from '@app/db/subscription';
import {
  getPublicPlansForbiddenReason,
  isOriginAllowedForPublicPlans,
  jsonWithPublicPlansCors,
  resolveRequestOrigin,
  withPublicPlansCors,
} from '@/lib/public-plans-http';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

type public_plan_limit = number | 'unlimited';

type public_plan_json = Omit<
  plans,
  'id' | 'user_limit' | 'workspace_limit' | 'admin_limit' | 'booking_limit' | 'service_provider_limit'
> & {
  booking_limit: public_plan_limit;
  service_provider_limit: public_plan_limit;
};

function toPublicLimitValue(value: number): public_plan_limit {
  return value === UNLIMITED_BOOKING_LIMIT ? 'unlimited' : value;
}

function planToPublicJson(plan: plans): public_plan_json {
  const {
    id: _id,
    user_limit: _userLimit,
    workspace_limit: _workspaceLimit,
    admin_limit: _adminLimit,
    booking_limit,
    service_provider_limit,
    ...rest
  } = plan;
  return {
    ...rest,
    booking_limit: toPublicLimitValue(booking_limit),
    service_provider_limit: toPublicLimitValue(service_provider_limit),
  };
}

export async function OPTIONS(req: Request) {
  return withPublicPlansCors(req, new NextResponse(null, { status: 204 }));
}

/** Read-only plan catalog for allowlisted external pricing pages (CORS). */
export async function GET(req: Request) {
  const origin = resolveRequestOrigin(req);
  if (!isOriginAllowedForPublicPlans(origin)) {
    return jsonWithPublicPlansCors(
      req,
      {
        error: 'Forbidden',
        reason: getPublicPlansForbiddenReason(req),
      },
      { status: 403 }
    );
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return jsonWithPublicPlansCors(req, { error: 'Server configuration error' }, { status: 500 });
  }

  try {
    const rows = await listActivePlans(supabase);
    const plans = rows
      .filter((plan) => plan.slug !== CLAIM_FREE_PLAN_SLUG)
      .map(planToPublicJson);
    return jsonWithPublicPlansCors(req, { plans });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    console.error('GET /api/public/plans:', err);
    return jsonWithPublicPlansCors(req, { error: message }, { status: 500 });
  }
}