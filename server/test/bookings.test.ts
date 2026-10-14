import request from "supertest"
import { describe, expect, it } from "vitest"

import { createApp } from "../src/app"
import { Booking } from "../src/modules/bookings/booking.model"
import { SlotCounter } from "../src/modules/bookings/slot-counter.model"
import { useTestDb } from "./db"
import { bookingBody, inDays, signIn } from "./helpers"

useTestDb()
const app = createApp()

const DTO_KEYS = [
  "createdAt", "date", "fullName", "id", "notes", "petInfo", "petType",
  "phone", "service", "specialist", "status", "time", "updatedAt",
]

const book = (overrides: Record<string, unknown> = {}) =>
  request(app).post("/api/bookings").send(bookingBody(overrides))

describe("POST /api/bookings", () => {
  it("lets a guest book and returns exactly the Booking shape", async () => {
    const res = await book().expect(201)
    expect(Object.keys(res.body).sort()).toEqual(DTO_KEYS)
    expect(res.body).toMatchObject({ status: "pending", notes: "", date: inDays(3), time: "10:30" })
    expect(new Date(res.body.createdAt).toISOString()).toBe(res.body.createdAt)

    const stored = await Booking.findById(res.body.id).lean()
    expect(stored?.userId).toBeUndefined()
    expect(stored?.phoneDigits).toBe("5550192")
  })

  it("links the booking to a signed-in user", async () => {
    const { agent, user } = await signIn(app, "owner")
    const res = await agent.post("/api/bookings").send(bookingBody()).expect(201)
    const stored = await Booking.findById(res.body.id).lean()
    expect(stored?.userId?.toString()).toBe(user._id.toString())
  })

  it("returns field errors keyed like the form", async () => {
    const res = await book({ petType: "lizard", phone: "abc", date: "2026-02-31" }).expect(400)
    expect(res.body.error.code).toBe("VALIDATION_ERROR")
    expect(Object.keys(res.body.error.fields).sort()).toEqual(["date", "petType", "phone"])
  })

  it("rejects a slot in the past", async () => {
    const res = await book({ date: inDays(-1) }).expect(400)
    expect(res.body.error.code).toBe("SLOT_IN_PAST")
    expect(res.body.error.fields.time).toBeDefined()
  })
})

describe("double booking", () => {
  it("a named specialist can't be booked twice for the same slot", async () => {
    await book().expect(201)
    const res = await book({ fullName: "Someone Else" }).expect(409)
    expect(res.body.error.code).toBe("SLOT_TAKEN")
    expect(res.body.error.fields.time).toBeDefined()
  })

  it("concurrent requests for a named slot: exactly one wins", async () => {
    const results = await Promise.all([book(), book(), book()])
    expect(results.map((r) => r.status).sort()).toEqual([201, 409, 409])
    expect(await Booking.countDocuments()).toBe(1)
  })

  it("'any' bookings are capped at ANY_SLOT_CAPACITY per slot", async () => {
    await book({ specialist: "any" }).expect(201)
    await book({ specialist: "any" }).expect(201)
    const res = await book({ specialist: "any" }).expect(409)
    expect(res.body.error.code).toBe("SLOT_TAKEN")
  })

  it("concurrent 'any' requests never exceed capacity", async () => {
    const results = await Promise.all(
      Array.from({ length: 5 }, () => book({ specialist: "any" }))
    )
    expect(results.map((r) => r.status).sort()).toEqual([201, 201, 409, 409, 409])
    const counter = await SlotCounter.findOne({ date: inDays(3), time: "10:30" }).lean()
    expect(counter?.anyCount).toBe(2)
  })

  it("named and 'any' capacity are counted independently", async () => {
    await book({ specialist: "clara-vance" }).expect(201)
    await book({ specialist: "any" }).expect(201)
    await book({ specialist: "any" }).expect(201)
  })

  it("different slots don't interfere", async () => {
    await book({ time: "09:00" }).expect(201)
    await book({ time: "10:30" }).expect(201)
    await book({ date: inDays(4), time: "09:00" }).expect(201)
  })
})
