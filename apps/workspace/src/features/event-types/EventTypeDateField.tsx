"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LuCalendar, LuChevronLeft, LuChevronRight } from "react-icons/lu";
import {
  format_iso_date_display,
  iso_date_from_date,
  parse_iso_date_input,
} from "@/src/features/event-types/event_type_availability";
import {
  picker_overlay_class,
  use_picker_overlay_placement,
} from "@/src/features/event-types/event_type_picker_placement";

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;
const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

type EventTypeDateFieldProps = {
  value: string;
  onChange: (next: string) => void;
  min?: string;
  max?: string;
  invalid?: boolean;
  error_id?: string;
  described_by?: string;
  focus_key?: string;
  disabled?: boolean;
  readOnly?: boolean;
};

type picker_date = {
  year: number;
  month: number;
  day: number;
};

function parts_from_iso_date(value: string): picker_date {
  const parsed = parse_iso_date_input(value);
  const date = parsed ? new Date(`${parsed}T00:00`) : new Date();
  return {
    year: date.getFullYear(),
    month: date.getMonth(),
    day: date.getDate(),
  };
}

function start_of_month(year: number, month: number): Date {
  return new Date(year, month, 1);
}

function calendar_cells(year: number, month: number): Date[] {
  const first = start_of_month(year, month);
  const start_weekday = first.getDay();
  const start = new Date(year, month, 1 - start_weekday);
  return Array.from({ length: 42 }, (_, i) => {
    const cell = new Date(start);
    cell.setDate(start.getDate() + i);
    return cell;
  });
}

function is_same_day(a: Date, b: picker_date): boolean {
  return (
    a.getFullYear() === b.year &&
    a.getMonth() === b.month &&
    a.getDate() === b.day
  );
}

function date_key(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function start_of_day_ms(year: number, month: number, day: number): number {
  return new Date(year, month, day).getTime();
}

export function EventTypeDateField({
  value,
  onChange,
  min,
  max,
  invalid = false,
  error_id,
  described_by,
  focus_key,
  disabled = false,
  readOnly = false,
}: EventTypeDateFieldProps) {
  const root_ref = useRef<HTMLDivElement>(null);
  const dialog_ref = useRef<HTMLDivElement>(null);
  const [open, set_open] = useState(false);
  const [draft, set_draft] = useState<picker_date>(() => parts_from_iso_date(value));
  const [view_month, set_view_month] = useState(() =>
    start_of_month(draft.year, draft.month)
  );

  const display_value = format_iso_date_display(value);
  const min_date = parse_iso_date_input(min ?? "");
  const max_date = parse_iso_date_input(max ?? "");
  const locked = disabled || readOnly;

  const cells = useMemo(
    () => calendar_cells(view_month.getFullYear(), view_month.getMonth()),
    [view_month]
  );

  useEffect(() => {
    if (!open) return;
    const next = parts_from_iso_date(value || min_date || iso_date_from_date(new Date()));
    set_draft(next);
    set_view_month(start_of_month(next.year, next.month));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open-only init
  }, [open]);

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

  const open_above = use_picker_overlay_placement(open, root_ref, dialog_ref);

  const commit = (next: picker_date) => {
    onChange(iso_date_from_date(new Date(next.year, next.month, next.day)));
    set_open(false);
  };

  const select_today = () => {
    let today = iso_date_from_date(new Date());
    if (min_date && today < min_date) today = min_date;
    if (max_date && today > max_date) today = max_date;
    const next = parts_from_iso_date(today);
    set_draft(next);
    set_view_month(start_of_month(next.year, next.month));
    commit(next);
  };

  return (
    <div ref={root_ref} className={`relative min-w-0 ${open ? "z-30" : ""}`}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-invalid={invalid}
        aria-describedby={
          [invalid && error_id ? error_id : null, described_by]
            .filter(Boolean)
            .join(" ") || undefined
        }
        aria-readonly={readOnly}
        data-event-type-field={focus_key}
        disabled={disabled}
        onClick={() => {
          if (locked) return;
          set_open((prev) => !prev);
        }}
        className={`flex w-full min-w-0 items-center justify-between gap-2 rounded-xl border bg-slate-50 px-3 py-2.5 text-left text-sm outline-none transition focus:bg-white disabled:cursor-not-allowed disabled:opacity-60 ${
          readOnly ? "cursor-not-allowed opacity-70" : ""
        } ${
          invalid
            ? "border-red-400 focus:border-red-400"
            : open
              ? "border-violet-400 bg-white"
              : "border-slate-200 focus:border-violet-400"
        }`}
      >
        <span className={`min-w-0 truncate ${display_value ? "text-slate-900" : "text-slate-400"}`}>
          {display_value || "dd-mm-yyyy"}
        </span>
        <LuCalendar className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
      </button>

      {open && !locked ? (
        <div
          ref={dialog_ref}
          role="dialog"
          aria-label="Choose date"
          className={picker_overlay_class(open_above)}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() =>
                set_view_month(
                  (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                )
              }
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
              aria-label="Previous month"
            >
              <LuChevronLeft className="h-3.5 w-3.5" aria-hidden />
            </button>
            <p className="truncate text-xs font-semibold text-slate-800">
              {MONTH_LABELS[view_month.getMonth()]} {view_month.getFullYear()}
            </p>
            <button
              type="button"
              onClick={() =>
                set_view_month(
                  (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                )
              }
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
              aria-label="Next month"
            >
              <LuChevronRight className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
          <div className="mb-1 grid grid-cols-7 gap-0.5">
            {WEEKDAY_LABELS.map((day) => (
              <div
                key={day}
                className="py-1 text-center text-[10px] font-semibold text-slate-400"
              >
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((cell) => {
              const in_month = cell.getMonth() === view_month.getMonth();
              const selected = is_same_day(cell, draft);
              const today = is_same_day(cell, {
                year: new Date().getFullYear(),
                month: new Date().getMonth(),
                day: new Date().getDate(),
              });
              const cell_ms = start_of_day_ms(
                cell.getFullYear(),
                cell.getMonth(),
                cell.getDate()
              );
              const min_ms = min_date
                ? start_of_day_ms(
                    Number(min_date.slice(0, 4)),
                    Number(min_date.slice(5, 7)) - 1,
                    Number(min_date.slice(8, 10))
                  )
                : null;
              const max_ms = max_date
                ? start_of_day_ms(
                    Number(max_date.slice(0, 4)),
                    Number(max_date.slice(5, 7)) - 1,
                    Number(max_date.slice(8, 10))
                  )
                : null;
              const out_of_range =
                (min_ms != null && cell_ms < min_ms) ||
                (max_ms != null && cell_ms > max_ms);
              return (
                <button
                  key={date_key(cell)}
                  type="button"
                  disabled={out_of_range}
                  onClick={() => {
                    const next = {
                      year: cell.getFullYear(),
                      month: cell.getMonth(),
                      day: cell.getDate(),
                    };
                    set_draft(next);
                    commit(next);
                  }}
                  className={`h-7 rounded-md text-[11px] font-medium transition disabled:cursor-not-allowed disabled:opacity-30 ${
                    selected
                      ? "bg-violet-600 text-white"
                      : today
                        ? "bg-violet-50 font-semibold text-violet-700 hover:bg-violet-100"
                        : in_month
                          ? "text-slate-700 hover:bg-slate-100"
                          : "text-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {cell.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex items-center gap-3 border-t border-slate-100 pt-2">
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
              onClick={select_today}
              className="text-sm font-medium text-violet-700 hover:text-violet-800"
            >
              Today
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
