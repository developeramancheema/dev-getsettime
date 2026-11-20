-- Allow onboarding audit events in the same table as login/logout (superadmin Auth activity).
alter table public.user_auth_activity
  drop constraint if exists user_auth_activity_event_type_check;

alter table public.user_auth_activity
  add constraint user_auth_activity_event_type_check
  check (
    event_type in (
      'login',
      'logout',
      'onboarding_workspace',
      'onboarding_step_1',
      'onboarding_step_2',
      'onboarding_step_3',
      'onboarding_complete',
      'onboarding_google_calendar',
      'onboarding_error'
    )
  );

comment on table public.user_auth_activity is
  'Workspace user auth and onboarding events; server-only via service role';
