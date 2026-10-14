import { describe, expect, it } from "vitest"

import { createApp } from "../src/app"
import { getStats } from "../src/modules/admin/stats.service"
import { useTestDb } from "./db"
import { insertBookings, rawBooking, signIn } from "./helpers"

useTestDb()
const app = createApp()

// 11:00 on Mar 15 2026 in New York (EDT, UTC-4).
const NOW = new Date("2026-03-15T15:00:00Z")
const NY = "America/New_York"
const CREATED_TODAY = new Date("2026-03-15T14:00:00Z")
// 22:00 on Mar 14 in New York, even though it's already Mar 15 in UTC.
const CREATED_LATE_14TH = new Date("2026-03-15T02:00:00Z")
// Before the 14-day window (which starts Mar 2).
const CREATED_LONG_AGO = new Date("2026-03-01T12:00:00Z")

type Status = "pending" | "confirmed" | "completed" | "cancelled"

describe("getStats", () => {
  it("matches the dashboard definitions in the clinic's zone", async () => {
    const at = (date: string, status: Status, createdAt = CREATED_TODAY) =>
      rawBooking({ date, status, createdAt, updatedAt: createdAt })

    await insertBookings([
      at("2026-03-15", "pending"), // today, pending
      at("2026-03-15", "cancelled"), // excluded from today
      at("2026-03-18", "confirmed"), // upcoming week
      at("2026-03-22", "pending"), // upcoming week (today + 7), pending
      at("2026-03-23", "pending"), // beyond the week, pending
      at("2026-03-10", "pending"), // past: not pending
      at("2026-03-02", "completed", CREATED_LATE_14TH), // completed this month
      at("2026-02-27", "completed", CREATED_LONG_AGO), // completed last month
    ])

    const stats = await getStats(NOW, NY)

    expect(stats).toMatchObject({ today: 1, upcomingWeek: 2, pending: 3, completedThisMonth: 1 })
    expect(stats.perDay).toHaveLength(14)
    expect(stats.perDay[0]).toEqual({ date: "2026-03-02", count: 0 })
    expect(stats.perDay[12]).toEqual({ date: "2026-03-14", count: 1 })
    expect(stats.perDay[13]).toEqual({ date: "2026-03-15", count: 6 })
    expect(stats.perDay.reduce((sum, d) => sum + d.count, 0)).toBe(7)
  })

  it("returns zeros on an empty database", async () => {
    const stats = await getStats(NOW, NY)
    expect(stats).toMatchObject({ today: 0, upcomingWeek: 0, pending: 0, completedThisMonth: 0 })
    expect(stats.perDay.every((d) => d.count === 0)).toBe(true)
  })
})

describe("GET /api/admin/bookings/stats", () => {
  it("is staff-only and returns the BookingStats shape", async () => {
    await (await signIn(app, "owner")).agent.get("/api/admin/bookings/stats").expect(403)

    const res = await (await signIn(app, "staff")).agent
      .get("/api/admin/bookings/stats")
      .expect(200)
    expect(Object.keys(res.body).sort()).toEqual(
      ["completedThisMonth", "pending", "perDay", "today", "upcomingWeek"]
    )
  })
})
