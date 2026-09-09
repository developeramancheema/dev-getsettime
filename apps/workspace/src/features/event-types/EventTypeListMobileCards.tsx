"use client";
import { useMemo, useState, useEffect, useRef, useCallback, type FormEvent } from "react";
import { LuMonitor, LuUser, LuUsers } from "react-icons/lu";
import { parse_event_type_format } from "@/src/features/event-types/event_type_format";
import type { event_type_format, event_type_status } from "@/src/types/event_types";
import { EventTypeActionsMenu } from "@/src/features/event-types/EventTypeActionsMenu";
import {
  ProviderAvatar,
  provider_initials,
} from "@/src/features/departments/DepartmentPanelPrimitives";
import {
  capitalize_booking_display_label,
  getServiceProviderName,
} from "@/src/utils/booking";
import { useServiceProviders } from "@/src/hooks/useBookingLookups";

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
  return "One-on-one";
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
  
  const [open_menu_id, set_open_menu_id] = useState<number | null>(null);

  const [copiedId, setCopiedId] = useState<number | null>(null);
  const { data: serviceProviders, loading: service_providers_loading } =
    useServiceProviders();
  

  const get_provider_avatar_url = (ownerId: string | null | undefined) => {
    if (!ownerId) return null;
    return (
      serviceProviders.find((provider) => provider.id === ownerId)?.avatar_url?.trim() ||
      null
    );
  };

  const get_provider_label = (ownerId: string | null | undefined) => {
    if (!ownerId) return "—";
    const name = capitalize_booking_display_label(
      getServiceProviderName(ownerId, serviceProviders)
    );
    return name === "N/A" ? "—" : name;
  };

  return (
    <>
    <div className="space-y-3 p-4">
        {items.map((item) => {
          const status = get_status(item.status);
          const status_label = get_status_label(status);
          const format = parse_event_type_format(item.event_type_format);
          const duration_label = format_duration_label(item.duration_minutes);
          const provider_label = get_provider_label(item.owner_id);
          const provider_avatar = get_provider_avatar_url(item.owner_id);


          return (
            <div
              key={item.id}
              onClick={() => on_row_click(item)}
              className="w-full space-y-2 rounded-2xl border border-slate-200 bg-white px-2 py-3 text-left shadow-sm transition active:bg-slate-50"
            >
              <div className="flex items-start gap-3">

                  <div
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                      format_icon_wrap_class(format, status)
                    )}
                  >
                    <FormatIcon format={format} />
                  </div>

                  <div className="flex-1 space-y-1">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {item.title}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <svg className="h-3 w-3 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                        {duration_label}
                      </span>
                    </p>
                    <p>
                      <span className="flex items-center gap-2 text-sm text-slate-700">
                      <ProviderAvatar
                        name={provider_label === "—" ? "Provider" : provider_label}
                        initials={provider_initials(
                          provider_label === "—" ? "?" : provider_label
                        )}
                        avatarUrl={provider_avatar}
                        size="sm"
                      />
                        <span className="truncate">{provider_label}</span>
                      </span>
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

                  {/* <div className="flex items-center justify-end">
                    <EventTypeActionsMenu
                      open={open_menu_id === item.id}
                      copy_disabled={loadingSlug || !item.slug}
                      copy_copied={copiedId === item.id}
                      on_toggle={() =>
                        set_open_menu_id((prev) =>
                          prev === item.id ? null : item.id
                        )
                      }
                      on_copy_link={() => {
                        //void handle_copy_link_from_menu(item);
                      }}
                      on_duplicate={() => {
                        //void handleDuplicate(item);
                        set_open_menu_id(null);
                      }}
                      on_delete={() => {
                        //handleDeleteClick(item.id);
                        set_open_menu_id(null);
                      }}
                      on_edit={() => {
                        //handleEdit(item);
                        set_open_menu_id(null);
                      }}
                    />
                  </div> */}

              </div>

              <div className="flex">
                <span className="text-xs text-indigo-600 bg-indigo-100 px-1.5 py-1 rounded-md">
                  {format_short_label(format)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
