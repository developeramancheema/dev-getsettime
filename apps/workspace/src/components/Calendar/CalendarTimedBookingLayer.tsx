"use client";

import type { Booking } from "@/src/types/booking";
import { CalendarBookingsOverflowPopover } from "@/src/components/Calendar/CalendarBookingsOverflowPopover";
import { CalendarTimedBookingCard } from "@/src/components/Calendar/CalendarTimedBookingCard";
import {
  formatCalendarTimeRangeHeading,
  type TimedLayoutItem,
} from "@/src/components/Calendar/calendar_booking_layout";

type CalendarTimedBookingLayerProps = {
  items: TimedLayoutItem[];
  selectedBookingId?: string;
  onSelectBooking: (booking: Booking) => void;
  showProvider?: boolean;
  getProviderName?: (booking: Booking) => string;
};

export function CalendarTimedBookingLayer({
  items,
  selectedBookingId,
  onSelectBooking,
  showProvider = false,
  getProviderName,
}: CalendarTimedBookingLayerProps) {
  return (
    <>
      {items.map((item) => {
        if (item.kind === "single") {
          return (
            <div
              key={item.booking.id}
              className="absolute z-10 px-1"
              style={{
                top: `${item.top}px`,
                left: "0%",
                width: "100%",
                height: `${Math.max(40, item.height - 2)}px`,
              }}
            >
              <CalendarTimedBookingCard
                booking={item.booking}
                selected={selectedBookingId === item.booking.id}
                showProvider={showProvider}
                providerName={getProviderName?.(item.booking)}
                onSelect={() => onSelectBooking(item.booking)}
                className="h-full"
              />
            </div>
          );
        }

        const clusterKey = `cluster-${item.startMinute}-${item.bookings.map((b) => b.id).join("-")}`;

        return (
          <div
            key={clusterKey}
            className="absolute z-10 px-1"
            style={{
              top: `${item.top}px`,
              left: "0%",
              width: "100%",
              height: `${Math.max(40, item.height - 2)}px`,
            }}
          >
            <div className="flex h-full min-h-0 flex-col gap-0.5">
              {item.visibleBookings.map((booking) => (
                <CalendarTimedBookingCard
                  key={booking.id}
                  booking={booking}
                  selected={selectedBookingId === booking.id}
                  compact
                  showProvider={showProvider}
                  providerName={getProviderName?.(booking)}
                  onSelect={() => onSelectBooking(booking)}
                  className="min-h-0 flex-1"
                />
              ))}
              <CalendarBookingsOverflowPopover
                heading={formatCalendarTimeRangeHeading(
                  item.startMinute,
                  item.endMinute,
                )}
                bookings={item.bookings}
                hiddenCount={item.hiddenCount}
                onBookingClick={onSelectBooking}
                triggerClassName="shrink-0 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-left text-[11px] font-semibold text-indigo-600 transition hover:bg-indigo-50 hover:text-indigo-700"
              />
            </div>
          </div>
        );
      })}
    </>
  );
}
