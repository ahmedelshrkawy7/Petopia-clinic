import { env } from "../../config/env"
import { addDaysKey, slotInstant, todayKey } from "../../lib/clinic-time"
import { Booking } from "../bookings/booking.model"

/** Matches the frontend's BookingStats (src/types/booking.ts). */
export type BookingStats = {
  today: number
  upcomingWeek: number
  pending: number
  completedThisMonth: number
  perDay: { date: string; count: number }[]
}

type CountRows = { n: number }[]
type Facets = {
  today: CountRows
  upcomingWeek: CountRows
  pending: CountRows
  completedThisMonth: CountRows
  perDay: { _id: string; count: number }[]
}

const PER_DAY_WINDOW = 14

export async function getStats(
  now: Date = new Date(),
  tz: string = env.CLINIC_TZ
): Promise<BookingStats> {
  const today = todayKey(now, tz)
  const weekEnd = addDaysKey(today, 7)
  const month = today.slice(0, 7)
  const firstDay = addDaysKey(today, -(PER_DAY_WINDOW - 1))
  const active = { status: { $ne: "cancelled" } }

  const [facets] = await Booking.aggregate<Facets>([
    {
      $facet: {
        today: [{ $match: { date: today, ...active } }, { $count: "n" }],
        upcomingWeek: [
          { $match: { date: { $gt: today, $lte: weekEnd }, ...active } },
          { $count: "n" },
        ],
        pending: [{ $match: { status: "pending", date: { $gte: today } } }, { $count: "n" }],
        completedThisMonth: [
          { $match: { status: "completed", date: { $gte: `${month}-01`, $lte: `${month}-31` } } },
          { $count: "n" },
        ],
        // Bucketed by the day each booking was *created*, in the clinic's zone.
        perDay: [
          { $match: { createdAt: { $gte: slotInstant(firstDay, "00:00", tz) } } },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: tz } },
              count: { $sum: 1 },
            },
          },
        ],
      },
    },
  ])

  const count = (rows: CountRows) => rows[0]?.n ?? 0
  const perDay = new Map(facets.perDay.map((row) => [row._id, row.count]))

  return {
    today: count(facets.today),
    upcomingWeek: count(facets.upcomingWeek),
    pending: count(facets.pending),
    completedThisMonth: count(facets.completedThisMonth),
    perDay: Array.from({ length: PER_DAY_WINDOW }, (_, i) => {
      const date = addDaysKey(firstDay, i)
      return { date, count: perDay.get(date) ?? 0 }
    }),
  }
}
