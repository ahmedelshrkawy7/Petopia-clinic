import { describe, expect, it } from "vitest"

import { addDaysKey, isPastSlot, slotInstant, todayKey } from "../src/lib/clinic-time"

const NY = "America/New_York"

describe("clinic time", () => {
  it("computes today in the clinic's zone, not UTC", () => {
    // 03:00 UTC on Mar 15 is still Mar 14 in New York.
    expect(todayKey(new Date("2026-03-15T03:00:00Z"), NY)).toBe("2026-03-14")
    expect(todayKey(new Date("2026-03-15T05:00:00Z"), NY)).toBe("2026-03-15")
  })

  it("adds days across month boundaries", () => {
    expect(addDaysKey("2026-02-27", 2)).toBe("2026-03-01")
    expect(addDaysKey("2026-03-01", -1)).toBe("2026-02-28")
    expect(addDaysKey("2026-03-15", -13)).toBe("2026-03-02")
  })

  it("converts a clinic-local slot to an instant, respecting DST", () => {
    expect(slotInstant("2026-01-15", "09:00", NY).toISOString()).toBe(
      "2026-01-15T14:00:00.000Z"
    )
    expect(slotInstant("2026-03-15", "09:00", NY).toISOString()).toBe(
      "2026-03-15T13:00:00.000Z"
    )
  })

  it("treats a slot as past from its start time", () => {
    expect(isPastSlot("2026-03-15", "09:00", new Date("2026-03-15T12:59:00Z"), NY)).toBe(false)
    expect(isPastSlot("2026-03-15", "09:00", new Date("2026-03-15T13:00:00Z"), NY)).toBe(true)
  })

  it("defaults to the configured CLINIC_TZ", () => {
    expect(todayKey(new Date("2026-03-15T03:00:00Z"))).toBe("2026-03-14")
  })
})
