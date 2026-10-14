import type { Express } from "express"
import { Types } from "mongoose"
import request from "supertest"

import { addDaysKey, todayKey } from "../src/lib/clinic-time"
import { hashPassword } from "../src/lib/passwords"
import { User, type Role } from "../src/modules/auth/user.model"
import { Booking, type BookingRecord } from "../src/modules/bookings/booking.model"

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

/** "yyyy-MM-dd" n days from today in the clinic's zone. */
export const inDays = (n: number) => addDaysKey(todayKey(), n)

export function bookingBody(overrides: Record<string, unknown> = {}) {
  return {
    petType: "dog",
    service: "wellness",
    specialist: "clara-vance",
    date: inDays(3),
    time: "10:30",
    fullName: "Jane Doe",
    phone: "555-0192",
    petInfo: "Rex, 4",
    ...overrides,
  }
}

/** A complete booking document for direct inserts (bypasses slot rules and timestamps). */
export function rawBooking(overrides: Partial<BookingRecord> = {}): BookingRecord {
  const now = new Date()
  const phone = overrides.phone ?? "555-0192"
  return {
    _id: new Types.ObjectId(),
    petType: "dog",
    service: "wellness",
    specialist: "any",
    date: inDays(3),
    time: "10:30",
    fullName: "Jane Doe",
    phone,
    phoneDigits: phone.replace(/\D/g, ""),
    petInfo: "Rex, 4",
    status: "pending",
    notes: "",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

export async function insertBookings(docs: BookingRecord[]) {
  await Booking.collection.insertMany(docs)
  return docs
}
