import { Link } from "react-router"

import { StatusBadge } from "@/components/admin/status-badge"
import { TIME_SLOTS } from "@/lib/booking-schema"
import { formatSlot, PET_LABELS, serviceLabel } from "@/lib/booking-format"
import type { Booking } from "@/types/booking"

export function TodaySchedule({ bookings }: { bookings: Booking[] }) {
  const active = bookings.filter((b) => b.status !== "cancelled")

  return (
    <ol className="flex flex-col">
      {TIME_SLOTS.map((slot) => {
        const inSlot = active.filter((b) => b.time === slot)
        return (
          <li
            key={slot}
            className="grid grid-cols-[72px_minmax(0,1fr)] gap-3 border-b border-border py-3 last:border-0"
          >
            <span className="pt-1 text-xs font-semibold text-muted-foreground tabular-nums">
              {formatSlot(slot)}
            </span>
            {inSlot.length === 0 ? (
              <span className="rounded-xl border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                Available
              </span>
            ) : (
              <div className="flex flex-col gap-2">
                {inSlot.map((b) => (
                  <Link
                    key={b.id}
                    to={`/admin/bookings/${b.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl bg-brand-soft/60 px-3 py-2 transition-colors outline-none hover:bg-brand-soft focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-foreground">
                        {b.fullName}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {PET_LABELS[b.petType]} · {b.petInfo} ·{" "}
                        {serviceLabel(b.service)}
                      </span>
                    </span>
                    <StatusBadge status={b.status} />
                  </Link>
                ))}
              </div>
            )}
          </li>
        )
      })}
    </ol>
  )
}
