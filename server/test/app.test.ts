import request from "supertest"
import { describe, expect, it } from "vitest"

import { createApp } from "../src/app"

const app = createApp()

describe("app shell", () => {
  it("reports health", async () => {
    const res = await request(app).get("/api/health").expect(200)
    expect(res.body).toEqual({ ok: true, db: "disconnected" })
  })

  it("returns the error shape for unknown API routes", async () => {
    const res = await request(app).get("/api/nope").expect(404)
    expect(res.body).toEqual({
      error: { code: "NOT_FOUND", message: "Route not found" },
    })
  })

  it("rejects malformed JSON with 400 INVALID_JSON", async () => {
    const res = await request(app)
      .post("/api/nope")
      .set("Content-Type", "application/json")
      .send("{bad json")
      .expect(400)
    expect(res.body.error.code).toBe("INVALID_JSON")
  })

  it("sets security headers", async () => {
    const res = await request(app).get("/api/health")
    expect(res.headers["x-content-type-options"]).toBe("nosniff")
  })
})
