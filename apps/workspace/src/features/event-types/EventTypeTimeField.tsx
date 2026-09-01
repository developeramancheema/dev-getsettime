"use client";

import { useEffect, useRef, useState } from "react";
import { LuClock, LuX } from "react-icons/lu";
import {
  format_time_display,
  parse_time_input,
  time_from_parts,
} from "@/src/features/event-types/event_type_availability";
import {
  picker_overlay_class,
  use_picker_overlay_placement,
} from "@/src/features/event-types/event_type_picker_placement";

const HOURS_12 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const TIME_ITEM_HEIGHT = 28;
const TIME_LIST_HEIGHT = 112;
const TIME_LIST_SPACER = (TIME_LIST_HEIGHT - TIME_ITEM_HEIGHT) / 2;

type time_parts = {
  hour_12: number;
  minute: number;
  period: "AM" | "PM";
};

type EventTypeTimeFieldProps = {
  value: string;
  onChange: (next: string) => void;
  invalid?: boolean;
  error_id?: string;
  focus_key?: string;
};

function parts_from_time(value: string): time_parts {
  const parsed = parse_time_input(value);
  if (!parsed) {
    const now = new Date();
    const hour_24 = now.getHours();
    return {
      hour_12: hour_24 % 12 === 0 ? 12 : hour_24 % 12,
      minute: now.getMinutes(),
      period: hour_24 >= 12 ? "PM" : "AM",
    };
  }
  const [hour_raw, minute_raw] = parsed.split(":");
  const hour_24 = parseInt(hour_raw, 10);
  const minute = parseInt(minute_raw, 10);
  return {
    hour_12: hour_24 % 12 === 0 ? 12 : hour_24 % 12,
    minute,
    period: hour_24 >= 12 ? "PM" : "AM",
  };
}

function scroll_selected_into_view(
  container: HTMLElement | null,
  item: HTMLElement | null
) {
  if (!container || !item) return;
  container.scrollTop = Math.max(0, item.offsetTop - TIME_LIST_SPACER);
}

export function EventTypeTimeField({
  value,
  onChange,
  invalid = false,
  error_id,
  focus_key,
}: EventTypeTimeFieldProps) {
  const root_ref = useRef<HTMLDivElement>(null);
  const dialog_ref = useRef<HTMLDivElement>(null);
  const hour_list_ref = useRef<HTMLDivElement>(null);
  const minute_list_ref = useRef<HTMLDivElement>(null);
  const hour_selected_ref = useRef<HTMLButtonElement>(null);
  const minute_selected_ref = useRef<HTMLButtonElement>(null);
  const [open, set_open] = useState(false);
  const [draft, set_draft] = useState<time_parts>(() => parts_from_time(value));

  const display_value = format_time_display(value);
  const open_above = use_picker_overlay_placement(open, root_ref, dialog_ref);

  useEffect(() => {
    if (!open) return;
    set_draft(parts_from_time(value));
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const on_pointer_down = (event: MouseEvent) => {
      if (root_ref.current?.contains(event.target as Node)) return;
      set_open(false);
    };
    const on_key_down = (event: KeyboardEvent) => {
      if (event.key === "Escape") set_open(false);
    };
    document.addEventListener("mousedown", on_pointer_down);
    document.addEventListener("keydown", on_key_down);
    return () => {
      document.removeEventListener("mousedown", on_pointer_down);
      document.removeEventListener("keydown", on_key_down);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      scroll_selected_into_view(hour_list_ref.current, hour_selected_ref.current);
      scroll_selected_into_view(minute_list_ref.current, minute_selected_ref.current);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, draft.hour_12, draft.minute]);

  const scroll_item_class = (selected: boolean) =>
    `relative z-20 flex h-7 w-full items-center justify-center rounded-md text-sm tabular-nums ${
      selected
        ? "font-semibold text-violet-700"
        : "text-slate-500 hover:text-slate-800"
    }`;

  const commit = (next: time_parts) => {
    onChange(time_from_parts(next.hour_12, next.minute, next.period));
    set_open(false);
  };

  return (
    <div ref={root_ref} className={`relative min-w-0 ${open ? "z-30" : ""}`}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-invalid={invalid}
        aria-describedby={invalid && error_id ? error_id : undefined}
        data-event-type-field={focus_key}
        onClick={() => set_open((prev) => !prev)}
        className={`flex w-full min-w-0 items-center justify-between gap-2 rounded-xl border bg-slate-50 px-3 py-2.5 text-left text-sm outline-none transition focus:bg-white ${
          invalid
            ? "border-red-400 focus:border-red-400"
            : open
              ? "border-violet-400 bg-white"
              : "border-slate-200 focus:border-violet-400"
        }`}
      >
        <span className={`min-w-0 truncate ${display_value ? "text-slate-900" : "text-slate-400"}`}>
          {display_value || "hh:mm AM/PM"}
        </span>
        <LuClock className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
      </button>

      {open ? (
        <div
          ref={dialog_ref}
          role="dialog"
          aria-label="Choose time"
          className={picker_overlay_class(open_above)}
        >
          <div className="mb-2 flex items-center gap-2">
            <p className="min-w-0 flex-1 text-center text-sm font-semibold text-slate-800">
              Select time
            </p>
            <button
              type="button"
              onClick={() => set_open(false)}
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              aria-label="Close"
            >
              <LuX className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <p className="mb-2 text-center text-base font-semibold tabular-nums text-slate-900">
            {String(draft.hour_12).padStart(2, "0")}:
            {String(draft.minute).padStart(2, "0")} {draft.period}
          </p>
          <div className="flex items-stretch justify-center gap-2">
            <div className="flex w-16 flex-col items-center">
              <span className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Hours
              </span>
              <div className="relative w-full">
                <div
                  className="pointer-events-none absolute inset-x-0 top-1/2 z-10 h-7 -translate-y-1/2 rounded-md bg-violet-100"
                  aria-hidden
                />
                <div
                  ref={hour_list_ref}
                  className="relative h-28 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  aria-label="Hours"
                >
                  <div style={{ height: TIME_LIST_SPACER }} />
                  {HOURS_12.map((hour) => (
                    <button
                      key={hour}
                      ref={draft.hour_12 === hour ? hour_selected_ref : undefined}
                      type="button"
                      onClick={() => set_draft((prev) => ({ ...prev, hour_12: hour }))}
                      className={scroll_item_class(draft.hour_12 === hour)}
                    >
                      {String(hour).padStart(2, "0")}
                    </button>
                  ))}
                  <div style={{ height: TIME_LIST_SPACER }} />
                </div>
              </div>
            </div>
            <span className="mt-8 self-center text-lg font-semibold text-slate-300">:</span>
            <div className="flex w-16 flex-col items-center">
              <span className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Minutes
              </span>
              <div className="relative w-full">
                <div
                  className="pointer-events-none absolute inset-x-0 top-1/2 z-10 h-7 -translate-y-1/2 rounded-md bg-violet-100"
                  aria-hidden
                />
                <div
                  ref={minute_list_ref}
                  className="relative h-28 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  aria-label="Minutes"
                >
                  <div style={{ height: TIME_LIST_SPACER }} />
                  {MINUTES.map((minute) => (
                    <button
                      key={minute}
                      ref={draft.minute === minute ? minute_selected_ref : undefined}
                      type="button"
                      onClick={() => set_draft((prev) => ({ ...prev, minute }))}
                      className={scroll_item_class(draft.minute === minute)}
                    >
                      {String(minute).padStart(2, "0")}
                    </button>
                  ))}
                  <div style={{ height: TIME_LIST_SPACER }} />
                </div>
              </div>
            </div>
            <div className="flex w-12 flex-col items-center">
              <span className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                AM/PM
              </span>
              <div className="flex h-28 flex-col justify-center gap-1" aria-label="AM or PM">
                {(["AM", "PM"] as const).map((period) => (
                  <button
                    key={period}
                    type="button"
                    onClick={() => set_draft((prev) => ({ ...prev, period }))}
                    className={`rounded-md px-2 py-1.5 text-xs font-semibold ${
                      draft.period === period
                        ? "bg-violet-600 text-white"
                        : "text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2">
            <button
              type="button"
              onClick={() => {
                onChange("");
                set_open(false);
              }}
              className="text-sm font-medium text-violet-700 hover:text-violet-800"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => commit(draft)}
              className="shrink-0 rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-violet-700"
            >
              Select
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
