import request from "supertest"
import { describe, expect, it } from "vitest"

import { createApp } from "../src/app"
import { Booking } from "../src/modules/bookings/booking.model"
import { SlotCounter } from "../src/modules/bookings/slot-counter.model"
import { useTestDb } from "./db"
import { bookingBody, inDays, signIn } from "./helpers"

useTestDb()
const app = createApp()

const create = async (overrides: Record<string, unknown> = {}) =>
  (await request(app).post("/api/bookings").send(bookingBody(overrides)).expect(201)).body
    .id as string

const anyCount = async () =>
  (await SlotCounter.findOne({ date: inDays(3), time: "10:30" }).lean())?.anyCount

async function staff() {
  return (await signIn(app, "staff")).agent
}

describe("PATCH /api/admin/bookings/status", () => {
  it("updates several bookings and bumps updatedAt", async () => {
    const a = await create({ time: "09:00" })
    const b = await create({ time: "13:15" })
    const before = await Booking.findById(a).lean()
    await new Promise((r) => setTimeout(r, 5))

    const res = await (await staff())
      .patch("/api/admin/bookings/status")
      .send({ ids: [a, b], status: "confirmed" })
      .expect(200)

    expect(res.body).toEqual({ updated: [a, b], failed: [] })
    const after = await Booking.findById(a).lean()
    expect(after?.status).toBe("confirmed")
    expect(after!.updatedAt.getTime()).toBeGreaterThan(before!.updatedAt.getTime())
  })

  it("cancelling frees the named slot and 'any' capacity", async () => {
    const named = await create()
    const any = await create({ specialist: "any" })
    await (await staff())
      .patch("/api/admin/bookings/status")
      .send({ ids: [named, any], status: "cancelled" })
      .expect(200)

    expect(await anyCount()).toBe(0)
    await create() // the named slot is free again
  })

  it("re-activating into a taken slot fails for that booking only", async () => {
    const agent = await staff()
    const first = await create()
    await agent.patch("/api/admin/bookings/status").send({ ids: [first], status: "cancelled" })
    const second = await create() // takes the freed slot
    const other = await create({ time: "15:45" })

    const res = await agent
      .patch("/api/admin/bookings/status")
      .send({ ids: [first, other], status: "confirmed" })
      .expect(200)

    expect(res.body).toEqual({ updated: [other], failed: [{ id: first, code: "SLOT_TAKEN" }] })
    expect((await Booking.findById(first).lean())?.status).toBe("cancelled")
    expect((await Booking.findById(second).lean())?.status).toBe("pending")
  })

  it("re-activating into a free slot holds it again", async () => {
    const agent = await staff()
    const id = await create()
    await agent.patch("/api/admin/bookings/status").send({ ids: [id], status: "cancelled" })
    await agent
      .patch("/api/admin/bookings/status")
      .send({ ids: [id], status: "pending" })
      .expect(200, { updated: [id], failed: [] })

    await request(app).post("/api/bookings").send(bookingBody()).expect(409)
  })

  it("reports unknown ids and rejects malformed ones", async () => {
    const agent = await staff()
    const unknown = "64b000000000000000000001"
    const res = await agent
      .patch("/api/admin/bookings/status")
      .send({ ids: [unknown], status: "confirmed" })
      .expect(200)
    expect(res.body.failed).toEqual([{ id: unknown, code: "NOT_FOUND" }])

    await agent
      .patch("/api/admin/bookings/status")
      .send({ ids: ["nope"], status: "confirmed" })
      .expect(400)
    await agent
      .patch("/api/admin/bookings/status")
      .send({ ids: [unknown], status: "archived" })
      .expect(400)
  })

  it("is staff-only", async () => {
    const { agent } = await signIn(app, "owner")
    await agent
      .patch("/api/admin/bookings/status")
      .send({ ids: ["64b000000000000000000001"], status: "confirmed" })
      .expect(403)
  })
})

describe("PATCH /api/admin/bookings/:id/notes", () => {
  it("saves notes and returns the updated booking", async () => {
    const id = await create()
    const res = await (await staff())
      .patch(`/api/admin/bookings/${id}/notes`)
      .send({ notes: "Bring vaccination card" })
      .expect(200)
    expect(res.body).toMatchObject({ id, notes: "Bring vaccination card" })
  })

  it("validates length and 404s for unknown ids", async () => {
    const agent = await staff()
    const id = await create()
    await agent.patch(`/api/admin/bookings/${id}/notes`).send({ notes: "x".repeat(2001) }).expect(400)
    await agent
      .patch("/api/admin/bookings/64b000000000000000000001/notes")
      .send({ notes: "hi" })
      .expect(404)
  })
})

describe("POST /api/admin/bookings/delete", () => {
  it("deletes bookings and frees their slots", async () => {
    const named = await create()
    const any = await create({ specialist: "any" })

    await (await staff())
      .post("/api/admin/bookings/delete")
      .send({ ids: [named, any] })
      .expect(204)

    expect(await Booking.countDocuments()).toBe(0)
    expect(await anyCount()).toBe(0)
    await create()
  })

  it("does not double-release a cancelled 'any' booking", async () => {
    const agent = await staff()
    const cancelled = await create({ specialist: "any" })
    await create({ specialist: "any" })
    await agent.patch("/api/admin/bookings/status").send({ ids: [cancelled], status: "cancelled" })
    expect(await anyCount()).toBe(1)

    await agent.post("/api/admin/bookings/delete").send({ ids: [cancelled] }).expect(204)
    expect(await anyCount()).toBe(1)
  })
})
