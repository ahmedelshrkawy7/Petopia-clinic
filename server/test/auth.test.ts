import request from "supertest"
import { describe, expect, it } from "vitest"

import { createApp } from "../src/app"
import { useTestDb } from "./db"
import { DAY_MS, createUser, findCookie, setCookies } from "./helpers"

useTestDb()
const app = createApp()
const HOUR_MS = 60 * 60 * 1000

describe("POST /api/auth/register", () => {
  it("creates an owner, sets httpOnly cookies and returns a 7-day session", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Jane Doe", email: "  Jane@Example.com ", password: "supersecret" })
      .expect(201)

    expect(res.body.user).toEqual({
      id: expect.any(String),
      email: "jane@example.com",
      name: "Jane Doe",
      role: "owner",
    })
    expect(res.body.expiresAt).toBeGreaterThan(Date.now() + 7 * DAY_MS - 60_000)

    const access = findCookie(res, "access_token")
    const refresh = findCookie(res, "refresh_token")
    expect(access).toMatch(/HttpOnly/)
    expect(access).toMatch(/SameSite=Lax/)
    expect(access).toMatch(/Path=\/;/)
    expect(refresh).toMatch(/Path=\/api\/auth/)
    expect(refresh).toMatch(/Max-Age=/)
  })

  it("rejects a duplicate email with 409 EMAIL_TAKEN", async () => {
    await createUser("owner", { email: "jane@example.com" })
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Jane", email: "JANE@example.com", password: "supersecret" })
      .expect(409)
    expect(res.body.error.code).toBe("EMAIL_TAKEN")
  })

  it("validates input", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "J", email: "not-an-email", password: "short" })
      .expect(400)
    expect(Object.keys(res.body.error.fields).sort()).toEqual(["email", "name", "password"])
  })

  it("never lets a client choose its role", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Mallory", email: "m@example.com", password: "supersecret", role: "admin" })
      .expect(201)
    expect(res.body.user.role).toBe("owner")
  })
})

describe("POST /api/auth/login", () => {
  it("returns the same 401 for an unknown email and a wrong password", async () => {
    await createUser("staff", { email: "staff@example.com", password: "right-password" })

    const unknown = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@example.com", password: "whatever1", remember: false })
      .expect(401)
    const wrong = await request(app)
      .post("/api/auth/login")
      .send({ email: "staff@example.com", password: "wrong-password", remember: false })
      .expect(401)

    expect(unknown.body).toEqual(wrong.body)
    expect(wrong.body.error).toEqual({
      code: "INVALID_CREDENTIALS",
      message: "Incorrect email or password",
    })
  })

  it("without remember: 12h session and browser-session cookies", async () => {
    const { user, password } = await createUser("staff")
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password, remember: false })
      .expect(200)

    expect(res.body.user.role).toBe("staff")
    expect(res.body.expiresAt).toBeGreaterThan(Date.now() + 12 * HOUR_MS - 60_000)
    expect(res.body.expiresAt).toBeLessThanOrEqual(Date.now() + 12 * HOUR_MS)
    for (const cookie of setCookies(res)) {
      expect(cookie).not.toMatch(/Max-Age|Expires/)
    }
  })

  it("with remember: 7-day session", async () => {
    const { user, password } = await createUser()
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password, remember: true })
      .expect(200)
    expect(res.body.expiresAt).toBeGreaterThan(Date.now() + 7 * DAY_MS - 60_000)
    expect(findCookie(res, "refresh_token")).toMatch(/Max-Age=/)
  })

  it("rate limits repeated attempts with 429", async () => {
    const limited = createApp({ authRateLimitMax: 2 })
    const attempt = () =>
      request(limited)
        .post("/api/auth/login")
        .send({ email: "x@example.com", password: "nope-nope", remember: false })
    await attempt().expect(401)
    await attempt().expect(401)
    const res = await attempt().expect(429)
    expect(res.body.error.code).toBe("RATE_LIMITED")
  })
})

describe("session lifecycle", () => {
  async function loggedInAgent(remember = true) {
    const { user, password } = await createUser("staff")
    const agent = request.agent(app)
    const login = await agent
      .post("/api/auth/login")
      .send({ email: user.email, password, remember })
      .expect(200)
    return { agent, login }
  }

  it("GET /session returns the session, or 401 without a cookie", async () => {
    const { agent, login } = await loggedInAgent()
    const res = await agent.get("/api/auth/session").expect(200)
    expect(res.body).toEqual(login.body)

    const anon = await request(app).get("/api/auth/session").expect(401)
    expect(anon.body.error.code).toBe("UNAUTHENTICATED")
  })

  it("POST /refresh issues new cookies but keeps expiresAt", async () => {
    const { agent, login } = await loggedInAgent(false)
    const res = await agent.post("/api/auth/refresh").expect(200)
    expect(res.body.expiresAt).toBe(login.body.expiresAt)
    expect(findCookie(res, "access_token")).toBeDefined()
    expect(findCookie(res, "refresh_token")).toBeDefined()
  })

  it("POST /logout clears cookies and revokes the old refresh token", async () => {
    const { agent, login } = await loggedInAgent()
    const oldRefresh = findCookie(login, "refresh_token")!.split(";")[0]

    const out = await agent.post("/api/auth/logout").expect(204)
    expect(findCookie(out, "access_token")).toMatch(/Expires=Thu, 01 Jan 1970/)
    expect(findCookie(out, "refresh_token")).toMatch(/Expires=Thu, 01 Jan 1970/)

    const replay = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", oldRefresh)
      .expect(401)
    expect(replay.body.error.code).toBe("UNAUTHENTICATED")
  })

  it("logout without a session still succeeds", async () => {
    await request(app).post("/api/auth/logout").expect(204)
  })
})

describe("privacy", () => {
  it("never exposes the password hash", async () => {
    const reg = await request(app)
      .post("/api/auth/register")
      .send({ name: "Jane", email: "jane@example.com", password: "supersecret" })
    const agent = request.agent(app)
    const login = await agent
      .post("/api/auth/login")
      .send({ email: "jane@example.com", password: "supersecret", remember: true })
    const session = await agent.get("/api/auth/session")

    for (const res of [reg, login, session]) {
      expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|\$2[aby]\$/)
    }
  })
})
