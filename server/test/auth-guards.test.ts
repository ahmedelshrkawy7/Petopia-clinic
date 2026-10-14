import cookieParser from "cookie-parser"
import express from "express"
import request from "supertest"
import { describe, expect, it } from "vitest"

import { signAccessToken } from "../src/lib/tokens"
import { attachUser, currentUser, requireRole } from "../src/middleware/auth"
import { errorHandler } from "../src/middleware/error-handler"

const app = express()
app.use(cookieParser(), attachUser)
app.get("/me", (req, res) => {
  res.json(currentUser(req))
})
app.get("/staff-only", requireRole("staff", "admin"), (_req, res) => {
  res.json({ ok: true })
})
app.use(errorHandler)

const cookieFor = (role: "owner" | "staff" | "admin") =>
  `access_token=${signAccessToken({ sub: "64b000000000000000000001", role })}`

describe("auth guards", () => {
  it("currentUser throws 401 without a cookie", async () => {
    const res = await request(app).get("/me").expect(401)
    expect(res.body.error.code).toBe("UNAUTHENTICATED")
  })

  it("ignores a forged or garbage token", async () => {
    await request(app).get("/me").set("Cookie", "access_token=not-a-jwt").expect(401)
  })

  it("exposes the user from a valid access token", async () => {
    const res = await request(app).get("/me").set("Cookie", cookieFor("owner")).expect(200)
    expect(res.body).toEqual({ id: "64b000000000000000000001", role: "owner" })
  })

  it("requireRole: 401 anonymous, 403 wrong role, 200 allowed role", async () => {
    await request(app).get("/staff-only").expect(401)
    const forbidden = await request(app)
      .get("/staff-only")
      .set("Cookie", cookieFor("owner"))
      .expect(403)
    expect(forbidden.body.error.code).toBe("FORBIDDEN")
    await request(app).get("/staff-only").set("Cookie", cookieFor("staff")).expect(200)
    await request(app).get("/staff-only").set("Cookie", cookieFor("admin")).expect(200)
  })
})
