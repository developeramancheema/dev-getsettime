"use client";

import { LuMonitor, LuUser, LuUsers } from "react-icons/lu";
import { parse_event_type_format } from "@/src/features/event-types/event_type_format";
import type { event_type_format, event_type_status } from "@/src/types/event_types";

export type event_type_list_item = {
  id: number;
  title: string;
  slug: string;
  duration_minutes: number | null;
  location_type: string | null;
  settings: unknown;
  status?: string | null;
  owner_id?: string | null;
  event_type_format?: string | null;
};

type EventTypeListMobileCardsProps = {
  items: event_type_list_item[];
  format_duration_label: (minutes: number | null) => string;
  get_status: (status: unknown) => event_type_status;
  get_status_label: (status: event_type_status) => string;
  on_row_click: (item: event_type_list_item) => void;
};

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

function format_short_label(format: event_type_format): string {
  if (format === "group_class") return "Group";
  if (format === "recurring") return "Recurring";
  return "1:1";
}

function format_icon_wrap_class(
  format: event_type_format,
  status: event_type_status
): string {
  if (status === "draft" && format === "group_class") {
    return "bg-orange-50 text-orange-600";
  }
  if (format === "group_class") return "bg-sky-50 text-sky-600";
  if (format === "recurring") return "bg-emerald-50 text-emerald-600";
  return "bg-indigo-50 text-indigo-600";
}

function FormatIcon({ format }: { format: event_type_format }) {
  if (format === "group_class") {
    return <LuUsers className="h-5 w-5" aria-hidden />;
  }
  if (format === "recurring") {
    return <LuMonitor className="h-5 w-5" aria-hidden />;
  }
  return <LuUser className="h-5 w-5" aria-hidden />;
}

export function EventTypeListMobileCards({
  items,
  format_duration_label,
  get_status,
  get_status_label,
  on_row_click,
}: EventTypeListMobileCardsProps) {
  return (
    <div className="space-y-3 p-4">
      {items.map((item) => {
        const status = get_status(item.status);
        const status_label = get_status_label(status);
        const format = parse_event_type_format(item.event_type_format);
        const duration_label = format_duration_label(item.duration_minutes);

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => on_row_click(item)}
            className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-2 py-3 text-left shadow-sm transition active:bg-slate-50"
          >
            <div
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                format_icon_wrap_class(format, status)
              )}
            >
              <FormatIcon format={format} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">
                {item.title}
              </p>
              <p className="mt-0.5 truncate text-xs text-slate-500">
                {duration_label}
                <span className="mx-1.5 text-slate-300" aria-hidden>
                  •
                </span>
                {format_short_label(format)}
              </p>
            </div>

            <span
              className={cn(
                "shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold",
                status === "active"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700"
              )}
            >
              {status_label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
