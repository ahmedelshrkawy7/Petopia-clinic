import type { Express } from "express"
import request from "supertest"

import { hashPassword } from "../src/lib/passwords"
import { User, type Role } from "../src/modules/auth/user.model"

export const DAY_MS = 24 * 60 * 60 * 1000

export function setCookies(res: { headers: Record<string, unknown> }): string[] {
  const raw = res.headers["set-cookie"]
  return Array.isArray(raw) ? (raw as string[]) : typeof raw === "string" ? [raw] : []
}

export function findCookie(res: { headers: Record<string, unknown> }, name: string) {
  return setCookies(res).find((c) => c.startsWith(`${name}=`))
}

export async function createUser(
  role: Role = "owner",
  overrides: { email?: string; password?: string; name?: string } = {}
) {
  const password = overrides.password ?? "correct-horse-1"
  const user = await User.create({
    email: overrides.email ?? `${role}-${crypto.randomUUID()}@example.com`,
    name: overrides.name ?? `Test ${role}`,
    role,
    passwordHash: await hashPassword(password),
  })
  return { user, password }
}

/** A supertest agent (keeps cookies) signed in as a fresh user with `role`. */
export async function signIn(app: Express, role: Role = "owner") {
  const { user, password } = await createUser(role)
  const agent = request.agent(app)
  await agent
    .post("/api/auth/login")
    .send({ email: user.email, password, remember: true })
    .expect(200)
  return { agent, user }
}
