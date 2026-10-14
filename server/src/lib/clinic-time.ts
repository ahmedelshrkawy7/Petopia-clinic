import { TZDate } from "@date-fns/tz"
import { format } from "date-fns"

import { env } from "../config/env"

// Every "today" / "past" decision is made in the clinic's zone, not the server's.

export function todayKey(now: Date = new Date(), tz: string = env.CLINIC_TZ): string {
  return format(new TZDate(now.getTime(), tz), "yyyy-MM-dd")
}

/** Calendar arithmetic on "yyyy-MM-dd" keys (no time zone involved). */
export function addDaysKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}

export function slotInstant(dateKey: string, time: string, tz: string = env.CLINIC_TZ): Date {
  const [year, month, day] = dateKey.split("-").map(Number)
  const [hours, minutes] = time.split(":").map(Number)
  return new Date(new TZDate(year, month - 1, day, hours, minutes, tz).getTime())
}

export function isPastSlot(
  dateKey: string,
  time: string,
  now: Date = new Date(),
  tz: string = env.CLINIC_TZ
): boolean {
  return slotInstant(dateKey, time, tz).getTime() <= now.getTime()
}
