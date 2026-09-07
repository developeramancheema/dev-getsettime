"use client";

import { useState } from "react";
import type { RefObject } from "react";
import { BookingPreviewPanel } from "@/src/components/Booking/BookingPreviewPanel";
import type { Booking } from "@/src/types/booking";
import { formatTime } from "@/src/utils/date";
import type { CalendarCell } from "@/src/components/Calendar/calendar_utils";
import {
  getStatusCalendarChipClass,
  toDateKey,
  WEEK_DAYS,
} from "@/src/components/Calendar/calendar_utils";

function cn(...classes: Array<string | false | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

type CalendarMonthGridProps = {
  rows: CalendarCell[][];
  bookingsByDay: Record<string, Booking[]>;
  loading: boolean;
  today: Date;
  monthLabel: string;
  todayCellRef?: RefObject<HTMLDivElement | null>;
};

export function CalendarMonthGrid({
  rows,
  bookingsByDay,
  loading,
  today,
  monthLabel,
  todayCellRef,
}: CalendarMonthGridProps) {
  const todayKey = toDateKey(today);
  const [preview_booking, set_preview_booking] = useState<Booking | null>(null);

  return (
    <>
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
        {WEEK_DAYS.map((day) => (
          <div
            key={day}
            className="px-2 py-3 text-center text-xs font-semibold text-slate-500"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="space-y-0">
        {rows.map((row, rowIndex) => (
          <div
            key={`${monthLabel}-${rowIndex}`}
            className="grid grid-cols-7 border-b border-slate-200 last:border-b-0"
          >
            {row.map((cell) => {
              const dateKey = toDateKey(cell.date);
              const dayBookings = bookingsByDay[dateKey] ?? [];
              const isCurrentMonth = cell.isCurrentMonth;
              const isToday = dateKey === todayKey;

              return (
                <div
                  key={cell.date.toISOString()}
                  ref={isToday ? todayCellRef : undefined}
                  className={cn(
                    "min-h-[140px] border-r border-slate-200 p-2 last:border-r-0",
                    isToday
                      ? "bg-blue-50/60 ring-2 ring-inset ring-blue-500"
                      : isCurrentMonth
                        ? "bg-white"
                        : "bg-slate-50/80",
                  )}
                >
                  <div className="mb-1.5">
                    <div
                      className={cn(
                        "inline-flex h-7 min-w-[28px] items-center justify-center rounded-full px-1.5 text-sm font-semibold",
                        isToday
                          ? "bg-blue-600 text-white"
                          : isCurrentMonth
                            ? "text-slate-800"
                            : "text-slate-400",
                      )}
                    >
                      {cell.dayNumber}
                    </div>
                  </div>

                  <div
                    className={cn(
                      "space-y-1",
                      loading && "pointer-events-none opacity-60",
                    )}
                  >
                    {loading && cell.isCurrentMonth && (
                      <div className="h-6 animate-pulse rounded-md bg-slate-100" />
                    )}

                    {!loading && dayBookings.length > 0 && (
                      <>
                        {dayBookings.slice(0, 3).map((booking) => {
                          const chipClass = getStatusCalendarChipClass(
                            booking.status,
                          );
                          const timeLabel = booking.start_at
                            ? formatTime(booking.start_at)
                            : "—";
                          const serviceLabel =
                            booking.event_types?.title?.trim() || "Appointment";

                          return (
                            <button
                              type="button"
                              key={booking.id}
                              title={`${timeLabel} ${serviceLabel}`}
                              onClick={() => set_preview_booking(booking)}
                              className={cn(
                                "flex w-full cursor-pointer items-center gap-1 truncate rounded-md px-1.5 py-2 text-left text-[11px] leading-tight transition",
                                chipClass.chip,
                              )}
                            >
                              <span
                                className={cn(
                                  "shrink-0 font-bold",
                                  chipClass.time,
                                )}
                              >
                                {timeLabel}
                              </span>
                              <span className="truncate font-medium text-slate-800">
                                {serviceLabel}
                              </span>
                            </button>
                          );
                        })}

                        {dayBookings.length > 3 && (
                          <div className="px-1 pt-0.5 text-[11px] font-semibold text-blue-600">
                            +{dayBookings.length - 3} more
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
    <BookingPreviewPanel
      open={preview_booking != null}
      onClose={() => set_preview_booking(null)}
      booking={preview_booking}
    />
    </>
  );
}
