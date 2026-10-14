import request from "supertest"
import { describe, expect, it } from "vitest"

import { createApp } from "../src/app"
import { Booking } from "../src/modules/bookings/booking.model"
import { SlotCounter } from "../src/modules/bookings/slot-counter.model"
import { useTestDb } from "./db"
import { bookingBody, inDays, insertBookings, rawBooking, signIn } from "./helpers"

useTestDb()
const app = createApp()

const availability = (date: string, specialist?: string) =>
  request(app)
    .get("/api/bookings/availability")
    .query({ date, ...(specialist ? { specialist } : {}) })

const takenTimes = (body: { slots: { time: string; available: boolean }[] }) =>
  body.slots.filter((s) => !s.available).map((s) => s.time)

describe("GET /api/bookings/availability", () => {
  it("lists every slot as available on an empty future day", async () => {
    const res = await availability(inDays(3), "clara-vance").expect(200)
    expect(res.body.date).toBe(inDays(3))
    expect(res.body.slots).toHaveLength(5)
    expect(takenTimes(res.body)).toEqual([])
  })

  it("reflects named and 'any' bookings separately", async () => {
    await request(app).post("/api/bookings").send(bookingBody({ time: "10:30" })).expect(201)
    for (let i = 0; i < 2; i++) {
      await request(app)
        .post("/api/bookings")
        .send(bookingBody({ specialist: "any", time: "09:00" }))
        .expect(201)
    }

    expect(takenTimes((await availability(inDays(3), "clara-vance")).body)).toEqual(["10:30"])
    expect(takenTimes((await availability(inDays(3), "any")).body)).toEqual(["09:00"])
    // specialist defaults to "any"
    expect(takenTimes((await availability(inDays(3))).body)).toEqual(["09:00"])
  })

  it("marks every slot of a past day unavailable", async () => {
    const res = await availability(inDays(-1)).expect(200)
    expect(res.body.slots.every((s: { available: boolean }) => !s.available)).toBe(true)
  })

  it("validates the query", async () => {
    const res = await availability("tomorrow").expect(400)
    expect(res.body.error.fields.date).toBeDefined()
  })
})

describe("GET /api/bookings/mine", () => {
  it("requires sign-in", async () => {
    await request(app).get("/api/bookings/mine").expect(401)
  })

  it("returns only the caller's bookings, newest first, without notes", async () => {
    const { agent, user } = await signIn(app, "owner")
    await insertBookings([
      rawBooking({ userId: user._id, date: inDays(2), notes: "internal" }),
      rawBooking({ userId: user._id, date: inDays(5) }),
      rawBooking({ date: inDays(4) }), // someone else's
    ])

    const res = await agent.get("/api/bookings/mine").expect(200)
    expect(res.body.map((b: { date: string }) => b.date)).toEqual([inDays(5), inDays(2)])
    for (const booking of res.body) expect(booking).not.toHaveProperty("notes")
  })
})

describe("PATCH /api/bookings/:id/cancel", () => {
  it("cancels the owner's booking and frees a named slot", async () => {
    const { agent } = await signIn(app, "owner")
    const created = await agent.post("/api/bookings").send(bookingBody()).expect(201)

    const res = await agent.patch(`/api/bookings/${created.body.id}/cancel`).expect(200)
    expect(res.body.status).toBe("cancelled")
    expect(res.body).not.toHaveProperty("notes")

    await request(app).post("/api/bookings").send(bookingBody()).expect(201)
  })

  it("frees capacity for an 'any' booking", async () => {
    const { agent } = await signIn(app, "owner")
    const created = await agent
      .post("/api/bookings")
      .send(bookingBody({ specialist: "any" }))
      .expect(201)
    await agent.patch(`/api/bookings/${created.body.id}/cancel`).expect(200)

    const counter = await SlotCounter.findOne({ date: inDays(3), time: "10:30" }).lean()
    expect(counter?.anyCount).toBe(0)
  })

  it("404s for someone else's booking or a malformed id; 401 when anonymous", async () => {
    const other = await request(app).post("/api/bookings").send(bookingBody()).expect(201)
    const { agent } = await signIn(app, "owner")

    await agent.patch(`/api/bookings/${other.body.id}/cancel`).expect(404)
    await agent.patch("/api/bookings/not-an-id/cancel").expect(404)
    await request(app).patch(`/api/bookings/${other.body.id}/cancel`).expect(401)
    expect((await Booking.findById(other.body.id).lean())?.status).toBe("pending")
  })

  it("409s when already cancelled or in the past", async () => {
    const { agent, user } = await signIn(app, "owner")
    const [cancelled, past] = await insertBookings([
      rawBooking({ userId: user._id, status: "cancelled" }),
      rawBooking({ userId: user._id, date: inDays(-1) }),
    ])

    for (const booking of [cancelled, past]) {
      const res = await agent.patch(`/api/bookings/${booking._id}/cancel`).expect(409)
      expect(res.body.error.code).toBe("NOT_CANCELLABLE")
    }
  })
})
