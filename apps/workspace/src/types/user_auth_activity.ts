export type user_auth_activity_event_type =
  | "login"
  | "logout"
  | "onboarding_workspace"
  | "onboarding_step_1"
  | "onboarding_step_2"
  | "onboarding_step_3"
  | "onboarding_complete"
  | "onboarding_google_calendar"
  | "onboarding_error";

export const USER_AUTH_ACTIVITY_EVENT_TYPES: readonly user_auth_activity_event_type[] = [
  "login",
  "logout",
  "onboarding_workspace",
  "onboarding_step_1",
  "onboarding_step_2",
  "onboarding_step_3",
  "onboarding_complete",
  "onboarding_google_calendar",
  "onboarding_error",
] as const;

export type user_auth_activity = {
  id: string;
  user_id: string;
  workspace_id: number;
  event_type: user_auth_activity_event_type;
  supabase_auth_event: string | null;
  reason: string | null;
  ip_address: string | null;
  user_agent: string | null;
  auth_session_id: string | null;
  created_at: string;
};

/** Body accepted by POST /api/auth/activity-log (server fills user_id, workspace_id, ip). */
export type user_auth_activity_log_request = {
  event_type: user_auth_activity_event_type;
  supabase_auth_event?: string | null;
  reason?: string | null;
};

export function is_user_auth_activity_event_type(
  value: unknown
): value is user_auth_activity_event_type {
  return (
    typeof value === "string" &&
    (USER_AUTH_ACTIVITY_EVENT_TYPES as readonly string[]).includes(value)
  );
}
