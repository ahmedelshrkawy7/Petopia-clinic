import request from "supertest"
import { describe, expect, it } from "vitest"

import { createApp } from "../src/app"
import { exportBookings } from "../src/modules/admin/admin-bookings.service"
import { useTestDb } from "./db"
import { inDays, insertBookings, rawBooking, signIn } from "./helpers"

useTestDb()
const app = createApp()

async function staff() {
  return (await signIn(app, "staff")).agent
}

const ids = (body: { items?: { id: string }[] } | { id: string }[]) =>
  (Array.isArray(body) ? body : body.items ?? []).map((b) => b.id)

describe("access control", () => {
  it("401 anonymous, 403 owner, 200 staff and admin", async () => {
    await request(app).get("/api/admin/bookings").expect(401)
    await (await signIn(app, "owner")).agent.get("/api/admin/bookings").expect(403)
    await (await signIn(app, "staff")).agent.get("/api/admin/bookings").expect(200)
    await (await signIn(app, "admin")).agent.get("/api/admin/bookings").expect(200)
  })
})

describe("GET /api/admin/bookings", () => {
  it("filters by status, service and petType (repeated or comma-separated)", async () => {
    const [a, b, c] = await insertBookings([
      rawBooking({ status: "pending", service: "dental", petType: "cat" }),
      rawBooking({ status: "confirmed", service: "dental", petType: "dog" }),
      rawBooking({ status: "cancelled", service: "spa", petType: "dog" }),
    ])
    const agent = await staff()

    const repeated = await agent.get("/api/admin/bookings?status=pending&status=confirmed").expect(200)
    expect(ids(repeated.body).sort()).toEqual([a, b].map((d) => d._id.toString()).sort())

    const comma = await agent.get("/api/admin/bookings?status=pending,cancelled").expect(200)
    expect(ids(comma.body).sort()).toEqual([a, c].map((d) => d._id.toString()).sort())

    const combined = await agent.get("/api/admin/bookings?service=dental&petType=dog").expect(200)
    expect(ids(combined.body)).toEqual([b._id.toString()])
  })

  it("filters by inclusive date range", async () => {
    const docs = await insertBookings([1, 2, 3, 4].map((n) => rawBooking({ date: inDays(n) })))
    const res = await (await staff())
      .get("/api/admin/bookings")
      .query({ from: inDays(2), to: inDays(3), sort: "date-asc" })
      .expect(200)
    expect(ids(res.body)).toEqual([docs[1], docs[2]].map((d) => d._id.toString()))
  })

  it("searches name and pet info case-insensitively, and phone by digits", async () => {
    const [jane, max, phone] = await insertBookings([
      rawBooking({ fullName: "Jane Doe", petInfo: "Rex, 4" }),
      rawBooking({ fullName: "Omar Ali", petInfo: "Max the Cat" }),
      rawBooking({ fullName: "Li Wei", petInfo: "Bun", phone: "(555) 777-1234" }),
    ])
    const agent = await staff()
    const search = async (q: string) =>
      ids((await agent.get("/api/admin/bookings").query({ search: q }).expect(200)).body)

    expect(await search("jane")).toEqual([jane._id.toString()])
    expect(await search("MAX")).toEqual([max._id.toString()])
    expect(await search("777-12")).toEqual([phone._id.toString()])
    expect(await search("(")).toEqual([]) // regex characters are escaped
  })

  it("sorts by appointment or creation time", async () => {
    const [early, late] = await insertBookings([
      rawBooking({ date: inDays(1), time: "09:00", createdAt: new Date("2026-01-02T00:00:00Z") }),
      rawBooking({ date: inDays(1), time: "13:15", createdAt: new Date("2026-01-01T00:00:00Z") }),
    ])
    const agent = await staff()
    const order = async (sort: string) =>
      ids((await agent.get("/api/admin/bookings").query({ sort }).expect(200)).body)

    const e = early._id.toString()
    const l = late._id.toString()
    expect(await order("date-asc")).toEqual([e, l])
    expect(await order("date-desc")).toEqual([l, e])
    expect(await order("created-asc")).toEqual([l, e])
    expect(await order("created-desc")).toEqual([e, l])
    expect(await order("")).toEqual([l, e]) // default date-desc
  })

  it("paginates with total, page and pageSize", async () => {
    await insertBookings(Array.from({ length: 25 }, () => rawBooking()))
    const agent = await staff()

    const res = await agent.get("/api/admin/bookings").query({ page: 3, pageSize: 10 }).expect(200)
    expect(res.body).toMatchObject({ total: 25, page: 3, pageSize: 10 })
    expect(res.body.items).toHaveLength(5)

    const defaults = await agent.get("/api/admin/bookings").expect(200)
    expect(defaults.body).toMatchObject({ page: 1, pageSize: 10 })

    await agent.get("/api/admin/bookings").query({ pageSize: 101 }).expect(400)
  })
})

describe("export and detail", () => {
  it("GET /export returns every match without pagination", async () => {
    await insertBookings(Array.from({ length: 12 }, () => rawBooking({ status: "pending" })))
    await insertBookings([rawBooking({ status: "cancelled" })])
    const res = await (await staff())
      .get("/api/admin/bookings/export")
      .query({ status: "pending" })
      .expect(200)
    expect(res.body).toHaveLength(12)
  })

  it("refuses exports above the cap", async () => {
    await insertBookings([rawBooking(), rawBooking(), rawBooking()])
    await expect(exportBookings({ sort: "date-desc" }, 2)).rejects.toMatchObject({
      status: 400,
      code: "EXPORT_TOO_LARGE",
    })
  })

  it("GET /:id returns one booking; 404 for unknown or malformed ids", async () => {
    const [doc] = await insertBookings([rawBooking({ notes: "Nervous dog" })])
    const agent = await staff()

    const res = await agent.get(`/api/admin/bookings/${doc._id}`).expect(200)
    expect(res.body).toMatchObject({ id: doc._id.toString(), notes: "Nervous dog" })

    await agent.get("/api/admin/bookings/64b000000000000000000001").expect(404)
    await agent.get("/api/admin/bookings/nope").expect(404)
  })
})
