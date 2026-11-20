import { createSupabaseServerClient } from "@app/db";
import type { NextRequest } from "next/server";
import type { user_auth_activity_event_type } from "@/src/types/user_auth_activity";

export type insert_user_auth_activity_params = {
  user_id: string;
  workspace_id: number;
  event_type: user_auth_activity_event_type;
  reason?: string | null;
  supabase_auth_event?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  auth_session_id?: string | null;
};

export function client_ip_from_headers(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = headers.get("x-real-ip");
  if (real?.trim()) return real.trim();
  return null;
}

export function request_client_meta(req: Request | NextRequest): {
  ip_address: string | null;
  user_agent: string | null;
} {
  return {
    ip_address: client_ip_from_headers(req.headers),
    user_agent: req.headers.get("user-agent")?.slice(0, 2000) ?? null,
  };
}

/**
 * Best-effort insert into user_auth_activity. Never throws; never blocks callers.
 */
export async function insert_user_auth_activity(
  params: insert_user_auth_activity_params
): Promise<void> {
  try {
    if (!params.user_id || !Number.isFinite(params.workspace_id) || params.workspace_id <= 0) {
      return;
    }
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.from("user_auth_activity").insert({
      user_id: params.user_id,
      workspace_id: params.workspace_id,
      event_type: params.event_type,
      supabase_auth_event: params.supabase_auth_event ?? null,
      reason: params.reason ?? null,
      ip_address: params.ip_address ?? null,
      user_agent: params.user_agent ?? null,
      auth_session_id: params.auth_session_id ?? null,
    });
    if (error) {
      console.error("user_auth_activity insert:", error);
    }
  } catch (e) {
    console.error("user_auth_activity insert failed:", e);
  }
}

export async function log_onboarding_activity(
  params: Omit<insert_user_auth_activity_params, "event_type"> & {
    event_type: user_auth_activity_event_type;
    req?: Request | NextRequest;
  }
): Promise<void> {
  const meta = params.req ? request_client_meta(params.req) : { ip_address: null, user_agent: null };
  await insert_user_auth_activity({
    user_id: params.user_id,
    workspace_id: params.workspace_id,
    event_type: params.event_type,
    reason: params.reason ?? null,
    supabase_auth_event: params.supabase_auth_event ?? null,
    auth_session_id: params.auth_session_id ?? null,
    ip_address: params.ip_address ?? meta.ip_address,
    user_agent: params.user_agent ?? meta.user_agent,
  });
}

export function truncate_activity_reason(message: string, max = 1800): string {
  const trimmed = message.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}
