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
  workspaces?: { name: string } | null;
};

/** Human-readable labels for superadmin Auth activity detail. */
export function format_user_auth_activity_event(
  event_type: string
): string {
  switch (event_type) {
    case "login":
      return "Login";
    case "logout":
      return "Logout";
    case "onboarding_workspace":
      return "Onboarding workspace";
    case "onboarding_step_1":
      return "Onboarding step 1";
    case "onboarding_step_2":
      return "Onboarding step 2";
    case "onboarding_step_3":
      return "Onboarding step 3";
    case "onboarding_complete":
      return "Onboarding complete";
    case "onboarding_google_calendar":
      return "Onboarding Google Calendar";
    case "onboarding_error":
      return "Onboarding error";
    default:
      return event_type;
  }
}
