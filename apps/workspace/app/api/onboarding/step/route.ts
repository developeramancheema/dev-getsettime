import { NextRequest, NextResponse } from 'next/server';
import type { DaySchedule } from '@/src/types/workspace';
import {
  apply_onboarding_step1,
  apply_onboarding_step2,
  apply_onboarding_step3,
  resolve_onboarding_auth_context,
} from '@/lib/onboarding-persistence';
import {
  log_onboarding_activity,
  truncate_activity_reason,
} from '@/lib/user_auth_activity_log';
import type { user_auth_activity_event_type } from '@/src/types/user_auth_activity';

function step_success_event(step: 1 | 2 | 3): user_auth_activity_event_type {
  if (step === 1) return 'onboarding_step_1';
  if (step === 2) return 'onboarding_step_2';
  return 'onboarding_step_3';
}

export async function POST(req: NextRequest) {
  try {
    const ctxOrError = await resolve_onboarding_auth_context(req);
    if ('error' in ctxOrError) {
      return NextResponse.json({ error: ctxOrError.error }, { status: ctxOrError.status });
    }

    const body = await req.json();
    const step = body?.step;

    if (step === 1) {
      const departmentNames = Array.isArray(body.department_names)
        ? (body.department_names as unknown[])
            .map((n) => (typeof n === 'string' ? n.trim() : ''))
            .filter((n): n is string => n.length > 0)
        : [];

      const result = await apply_onboarding_step1(ctxOrError, {
        department_names: departmentNames,
        professions_list_id:
          body.professions_list_id != null ? Number(body.professions_list_id) : undefined,
        custom_profession:
          typeof body.custom_profession === 'string' ? body.custom_profession : undefined,
      });

      if (result.error) {
        await log_onboarding_activity({
          req,
          user_id: ctxOrError.userId,
          workspace_id: ctxOrError.workspaceId,
          event_type: 'onboarding_error',
          reason: truncate_activity_reason(`Step 1: ${result.error}`),
        });
        return NextResponse.json({ error: result.error }, { status: 500 });
      }
      await log_onboarding_activity({
        req,
        user_id: ctxOrError.userId,
        workspace_id: ctxOrError.workspaceId,
        event_type: step_success_event(1),
        reason: 'Saved',
      });
      return NextResponse.json({ ok: true, step: 1 });
    }

    if (step === 2) {
      const result = await apply_onboarding_step2(ctxOrError);
      if (result.error) {
        await log_onboarding_activity({
          req,
          user_id: ctxOrError.userId,
          workspace_id: ctxOrError.workspaceId,
          event_type: 'onboarding_error',
          reason: truncate_activity_reason(`Step 2: ${result.error}`),
        });
        return NextResponse.json({ error: result.error }, { status: 500 });
      }
      await log_onboarding_activity({
        req,
        user_id: ctxOrError.userId,
        workspace_id: ctxOrError.workspaceId,
        event_type: step_success_event(2),
        reason: 'Saved',
      });
      return NextResponse.json({ ok: true, step: 2 });
    }

    if (step === 3) {
      const timesheet = body?.timesheet;
      if (!timesheet || typeof timesheet !== 'object') {
        await log_onboarding_activity({
          req,
          user_id: ctxOrError.userId,
          workspace_id: ctxOrError.workspaceId,
          event_type: 'onboarding_error',
          reason: 'Step 3: timesheet is required',
        });
        return NextResponse.json({ error: 'timesheet is required' }, { status: 400 });
      }

      const result = await apply_onboarding_step3(
        ctxOrError,
        timesheet as Record<string, DaySchedule>
      );
      if (result.error) {
        await log_onboarding_activity({
          req,
          user_id: ctxOrError.userId,
          workspace_id: ctxOrError.workspaceId,
          event_type: 'onboarding_error',
          reason: truncate_activity_reason(`Step 3: ${result.error}`),
        });
        return NextResponse.json({ error: result.error }, { status: 500 });
      }
      await log_onboarding_activity({
        req,
        user_id: ctxOrError.userId,
        workspace_id: ctxOrError.workspaceId,
        event_type: step_success_event(3),
        reason: 'Saved',
      });
      return NextResponse.json({ ok: true, step: 3 });
    }

    await log_onboarding_activity({
      req,
      user_id: ctxOrError.userId,
      workspace_id: ctxOrError.workspaceId,
      event_type: 'onboarding_error',
      reason: 'Invalid step',
    });
    return NextResponse.json({ error: 'Invalid step' }, { status: 400 });
  } catch (err: unknown) {
    console.error('onboarding/step:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    );
  }
}
