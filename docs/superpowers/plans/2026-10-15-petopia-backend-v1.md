# Petopia Backend v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An Express + MongoDB API in `server/` that is a drop-in replacement for the frontend's mock auth and bookings services, with double-booking protection.

**Architecture:** One Express 5 app built by `createApp()`, organized as feature modules (`auth`, `bookings`, `admin`). Each module has routes (thin handlers), a service (business rules) and Mongoose models. Request validation reuses the zod booking schema, which moves from `src/lib` to a repo-level `shared/` folder. All double-booking logic lives in one `slots.ts` module.

**Tech Stack:**
- Runtime: Node 22, Express 5, Mongoose 8, zod 4
- Auth: bcryptjs, jsonwebtoken, cookie-parser
- Security: helmet, cors, express-rate-limit
- Time: `@date-fns/tz`
- Dev/build: tsx, tsup
- Tests: Vitest + Supertest + mongodb-memory-server

**Spec:** `docs/superpowers/specs/2026-10-14-petopia-backend-v1-design.md`

## Global Constraints

- **Error shape:** every error response is `{ "error": { "code": string, "message": string, "fields"?: Record<string, string> } }`.
- **Booking JSON:** exactly the keys `id, createdAt, updatedAt, status, notes, petType, service, specialist, date, time, fullName, phone, petInfo`. Owner endpoints omit `notes`. Never send `_id`, `__v`, `userId`, `specialistSlotKey`, `phoneDigits`.
- **Dates:** `date` is a `"yyyy-MM-dd"` clinic-local day. "Today", past slots and stats buckets always use `env.CLINIC_TZ`, never the server's local zone.
- **Cookies:**
  - `access_token`: `Path=/`, 15 min.
  - `refresh_token`: `Path=/api/auth`. Absolute lifetime is 7 days (remember) or 12 h (not remember). Non-remember cookies have no `Max-Age`.
  - Both are `HttpOnly; SameSite=Lax`, plus `Secure` in production.
- **Slot rules:** a booking holds its slot while `status !== "cancelled"`. "Any" capacity is `env.ANY_SLOT_CAPACITY` per date+time. Named specialists hold one booking per date+time.
- **Shared dependencies:** `zod` and `date-fns` are **not** server dependencies. They resolve from the repo-root `node_modules`, so `shared/` and `server/` use one copy (no cross-copy zod type clashes); tsup bundles them into `dist/`. The root `npm install` must have been run.
- **Never commit the user's WIP.** The working tree has uncommitted frontend work (`src/App.tsx`, `src/components/booking-section.tsx`, `package.json`, untracked `src/services`, `src/types`, `src/pages`, …). Stage only the exact paths each task lists. Never `git add -A` or `git add .`.
- All commands run from the repo root `D:\Petopia` in Git Bash unless stated otherwise.

## Deviations from the spec (intentional, small)

| Spec | Plan | Why |
|---|---|---|
| `bcrypt` | `bcryptjs` | Same algorithm, no native build on Windows |
| controller files + `validate.ts` middleware | handlers live in `*.routes.ts`; `parse(schema, data)` helper | Handlers are 2–3 lines; a typed helper beats untyped `req` mutation (`req.query` is read-only in Express 5) |
| `requireAuth` middleware | `currentUser(req)` helper that throws 401 | Gives handlers a non-null user without `!` |
| `src/types/booking.ts` re-imports `BOOKING_STATUSES` | left untouched; `shared/` also exports it | That file is uncommitted WIP; repointing it belongs to the frontend sub-project |
| root `dev:server` script | documented `npm --prefix server run dev` instead | Root `package.json` has uncommitted WIP |
| optional `seed-demo.ts` | skipped | YAGNI |
| bulk-status failure codes `NOT_FOUND \| SLOT_TAKEN` | adds `CONFLICT` (booking changed concurrently) | Honest reporting of a race |
| — | extra env `BCRYPT_ROUNDS` (default 12), `AUTH_RATE_LIMIT_MAX` (default 10) | Fast tests; tunable limits |

## File Map

```
shared/booking-schema.ts                      # Task 1 (moved + extended)
src/lib/booking-schema.ts                     # Task 1 (becomes a re-export)
vite.config.ts, tsconfig.app.json, tsconfig.json   # Task 1 (alias + proxy)

server/
  package.json  tsconfig.json  tsup.config.ts  vitest.config.ts  .env.example  .gitignore   # Task 2
  README.md  requests.http                                                    # Task 11
  src/
    server.ts  app.ts                         # Task 2 (app.ts grows in 4, 5, 6, 8)
    config/env.ts                             # Task 2
    db/connect.ts                             # Task 2
    lib/app-error.ts  lib/validate.ts         # Task 2
    lib/clinic-time.ts                        # Task 3
    lib/passwords.ts  lib/tokens.ts  lib/auth-cookies.ts   # Task 4
    lib/object-id.ts                          # Task 6
    middleware/error-handler.ts               # Task 2
    middleware/auth.ts                        # Task 5
    types/express.d.ts                        # Task 5
    modules/auth/user.model.ts  auth.schemas.ts  auth.service.ts  auth.routes.ts   # Task 4
    modules/bookings/booking.model.ts  slot-counter.model.ts  slots.ts
                     booking.serializer.ts  bookings.service.ts  bookings.routes.ts  # Task 6 (+7)
    modules/admin/admin-bookings.schemas.ts  admin-bookings.service.ts
                  admin-bookings.routes.ts    # Task 8 (+9, 10)
    modules/admin/stats.service.ts            # Task 10
  scripts/seed-admin.ts                       # Task 5
  test/
    setup-env.ts  db.ts  config.test.ts  app.test.ts  validate.test.ts   # Task 2
    clinic-time.test.ts                       # Task 3
    helpers.ts  auth.test.ts                  # Task 4 (helpers grows in 6)
    auth-guards.test.ts                       # Task 5
    bookings.test.ts                          # Task 6
    bookings-owner.test.ts                    # Task 7
    admin-list.test.ts                        # Task 8
    admin-mutations.test.ts                   # Task 9
    stats.test.ts                             # Task 10
```

---

### Task 1: Shared booking schema + frontend wiring

**Files:**
- Create: `shared/booking-schema.ts`
- Modify: `src/lib/booking-schema.ts` (replace the whole file with a re-export)
- Modify: `vite.config.ts`, `tsconfig.app.json`, `tsconfig.json`

**Interfaces:**
- Produces (from `@shared/booking-schema`):
  - constants: `PET_TYPES`, `SERVICES`, `SPECIALISTS`, `TIME_SLOTS`, `BOOKING_STATUSES`, `SERVICE_VALUES`, `SPECIALIST_VALUES`
  - types: `PetType`, `ServiceValue`, `SpecialistValue`, `TimeSlot`, `BookingStatus`, `BookingRequest`, `BookingFormInput`, `BookingFormValues`
  - schemas: `dateKeySchema`, `phoneSchema`, `bookingSchema` (form, `date: Date`), `bookingRequestSchema` (wire, `date: "yyyy-MM-dd"`)
  - `isSlotInPast(date: Date, slot: string): boolean`

- [ ] **Step 1: Record the frontend baseline**

Run: `npm run build 2>&1 | tail -20`

Note whether it passes. The user's uncommitted WIP may already have errors. Afterwards, the result must be no worse.

- [ ] **Step 2: Create `shared/booking-schema.ts`**

```ts
import { isToday, startOfToday } from "date-fns"
import { z } from "zod"

// Shared by the Vite frontend (via @shared) and the Express server.

export const PET_TYPES = ["dog", "cat", "exotic", "other"] as const

export const SERVICES = [
  { value: "wellness", label: "Comprehensive Wellness Exam" },
  { value: "vaccines", label: "Vaccines & Immunization" },
  { value: "dental", label: "Gentle Dental & Hygiene" },
  { value: "surgery", label: "Surgery Consultation" },
  { value: "diagnostics", label: "Ultrasound & Digital X-Ray" },
  { value: "spa", label: "Therapeutic Spa & Grooming" },
] as const

export const SPECIALISTS = [
  { value: "any", label: "Any Available Doctor (Fastest)" },
  { value: "clara-vance", label: "Dr. Clara Vance, DVM" },
] as const

// 24h "HH:mm" values so they can be compared against the current time.
export const TIME_SLOTS = ["09:00", "10:30", "13:15", "15:45", "17:00"] as const

export const BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
] as const

type Values<T extends readonly { value: string }[]> = T[number]["value"]
const values = <T extends readonly { value: string }[]>(items: T) =>
  items.map((item) => item.value) as [Values<T>, ...Values<T>[]]

export const SERVICE_VALUES = values(SERVICES)
export const SPECIALIST_VALUES = values(SPECIALISTS)

export type PetType = (typeof PET_TYPES)[number]
export type ServiceValue = Values<typeof SERVICES>
export type SpecialistValue = Values<typeof SPECIALISTS>
export type TimeSlot = (typeof TIME_SLOTS)[number]
export type BookingStatus = (typeof BOOKING_STATUSES)[number]

export function isSlotInPast(date: Date, slot: string) {
  if (!isToday(date)) return false
  const [hours, minutes] = slot.split(":").map(Number)
  const slotTime = new Date(date)
  slotTime.setHours(hours, minutes, 0, 0)
  return slotTime.getTime() <= Date.now()
}

/** A "yyyy-MM-dd" day that exists on the calendar (rejects 2026-02-31). */
export const dateKeySchema = z
  .string({ error: "Pick a date" })
  .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Use the yyyy-MM-dd format" })
  .refine(
    (value) => {
      const date = new Date(`${value}T00:00:00Z`)
      return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value)
    },
    { error: "Pick a real calendar date" }
  )

export const phoneSchema = z
  .string({ error: "Enter a valid phone number" })
  .trim()
  .regex(/^[+\d\s().-]+$/, { error: "Use digits, spaces, + ( ) - only" })
  .refine((v) => v.replace(/\D/g, "").length >= 7, {
    error: "Enter a valid phone number",
  })

const bookingFields = {
  petType: z.enum(PET_TYPES, { error: "Choose your pet type" }),
  service: z.enum(SERVICE_VALUES, { error: "Choose a service" }),
  specialist: z.enum(SPECIALIST_VALUES, { error: "Choose a specialist" }),
  time: z.enum(TIME_SLOTS, { error: "Pick a time slot" }),
  fullName: z
    .string({ error: "Enter your full name" })
    .trim()
    .min(2, { error: "Enter your full name" })
    .max(80, { error: "Name is too long" }),
  phone: phoneSchema,
  petInfo: z
    .string({ error: "Tell us your pet's name and age" })
    .trim()
    .min(2, { error: "Tell us your pet's name and age" })
    .max(80, { error: "Keep it under 80 characters" }),
}

/** The booking form (react-hook-form). `date` is a Date in the browser's zone. */
export const bookingSchema = z
  .object({
    ...bookingFields,
    date: z
      .date({ error: "Pick a date" })
      // Evaluated per call so a long-lived tab or server never uses a stale "today".
      .refine((date) => date >= startOfToday(), {
        error: "Pick today or a future date",
      }),
  })
  .refine((data) => !isSlotInPast(data.date, data.time), {
    path: ["time"],
    error: "That time has already passed today",
  })

/** JSON body for POST /api/bookings: same fields, `date` as "yyyy-MM-dd". */
export const bookingRequestSchema = z.object({
  ...bookingFields,
  date: dateKeySchema,
})

export type BookingFormInput = z.input<typeof bookingSchema>
export type BookingFormValues = z.output<typeof bookingSchema>
export type BookingRequest = z.output<typeof bookingRequestSchema>
```

- [ ] **Step 3: Replace `src/lib/booking-schema.ts` with a re-export**

```ts
// Moved to shared/ so the server validates bookings with the same rules.
export * from "@shared/booking-schema"
```

- [ ] **Step 4: Add the `@shared` alias and the `/api` proxy to `vite.config.ts`**

```ts
import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
  server: {
    // The API (server/) runs on :4000; proxying keeps auth cookies same-origin.
    proxy: { "/api": "http://localhost:4000" },
  },
})
```

- [ ] **Step 5: Teach TypeScript about `shared/`**

In `tsconfig.app.json`, change `"paths"` and `"include"` to:

```json
    "paths": {
      "@/*": ["./src/*"],
      "@shared/*": ["./shared/*"]
    }
  },
  "include": ["src", "shared"]
```

In `tsconfig.json`, change `"paths"` to:

```json
    "paths": {
      "@/*": ["./src/*"],
      "@shared/*": ["./shared/*"]
    }
```

- [ ] **Step 6: Verify the frontend still builds**

Run: `npm run build 2>&1 | tail -20`

Expected: same result as the Step 1 baseline, with no new errors mentioning `booking-schema` or `@shared`.

- [ ] **Step 7: Commit (only these paths)**

```bash
git add shared/booking-schema.ts src/lib/booking-schema.ts vite.config.ts tsconfig.app.json tsconfig.json
git commit -m "refactor: move booking schema to shared/ and add API dev proxy"
```

---

### Task 2: Server scaffold: config, errors, app shell, test infrastructure

**Files:**
- Create: `server/package.json`, `server/tsconfig.json`, `server/tsup.config.ts`, `server/vitest.config.ts`, `server/.env.example`, `server/.gitignore`
- Create: `server/src/config/env.ts`, `server/src/lib/app-error.ts`, `server/src/lib/validate.ts`, `server/src/middleware/error-handler.ts`, `server/src/app.ts`, `server/src/db/connect.ts`, `server/src/server.ts`
- Test: `server/test/setup-env.ts`, `server/test/db.ts`, `server/test/config.test.ts`, `server/test/validate.test.ts`, `server/test/app.test.ts`

**Interfaces:**
- Produces:
  - `parseEnv(raw): Env` and `env: Env` with keys `NODE_ENV, PORT, MONGODB_URI, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, CLIENT_ORIGIN, ANY_SLOT_CAPACITY, CLINIC_TZ, BCRYPT_ROUNDS, AUTH_RATE_LIMIT_MAX`
  - `class AppError(status: number, code: string, message: string, fields?: Record<string,string>)` with `toJSON()`
  - `notFound(what?: string): AppError`
  - `isDuplicateKeyError(err: unknown): boolean`
  - `parse<S extends z.ZodType>(schema: S, data: unknown): z.output<S>`, which throws `AppError(400, "VALIDATION_ERROR", …, fields)`
  - `errorHandler`
  - `createApp(): Express`
  - `connectDb(uri: string): Promise<void>`
  - Test helper: `useTestDb()`

- [ ] **Step 1: Create `server/package.json`**

```json
{
  "name": "petopia-server",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "engines": { "node": ">=20.11" },
  "scripts": {
    "dev": "tsx watch --env-file=.env src/server.ts",
    "build": "tsup",
    "start": "node --env-file=.env dist/server.js",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "seed:admin": "tsx --env-file=.env scripts/seed-admin.ts"
  }
}
```

- [ ] **Step 2: Install dependencies**

Do not add `zod` or `date-fns`; see Global Constraints.

```bash
npm --prefix server install express@^5 mongoose@^8 jsonwebtoken bcryptjs cookie-parser cors helmet express-rate-limit @date-fns/tz
npm --prefix server install -D typescript@~6 tsx tsup vitest supertest mongodb-memory-server @types/node@^22 @types/express@^5 @types/jsonwebtoken @types/cookie-parser @types/cors @types/supertest
```

If `typescript@~6` does not resolve, use `typescript@^5.9`.

- [ ] **Step 3: Create the config files**

`server/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "lib": ["ES2023"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "types": ["node"],
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@shared/*": ["../shared/*"]
    }
  },
  "include": ["src", "scripts", "test", "../shared", "vitest.config.ts", "tsup.config.ts"]
}
```

`server/tsup.config.ts`:

```ts
import { defineConfig } from "tsup"

// Dependencies in package.json stay external; zod/date-fns (resolved from the
// repo root for shared/) are bundled so dist/ runs without the root install.
export default defineConfig({
  entry: ["src/server.ts"],
  format: ["esm"],
  platform: "node",
  target: "node20",
  outDir: "dist",
  clean: true,
  sourcemap: true,
})
```

`server/vitest.config.ts`:

```ts
import path from "node:path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: { "@shared": path.resolve(import.meta.dirname, "../shared") },
  },
  test: {
    environment: "node",
    setupFiles: ["./test/setup-env.ts"],
    testTimeout: 30_000,
    // The first run downloads a MongoDB binary for mongodb-memory-server.
    hookTimeout: 180_000,
  },
})
```

`server/.env.example`:

```bash
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/petopia
# 32+ random characters each, and different from each other:
#   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
CLIENT_ORIGIN=http://localhost:5173
ANY_SLOT_CAPACITY=2
# IANA zone of the clinic, e.g. America/New_York
CLINIC_TZ=
# Only used by `npm run seed:admin`
ADMIN_EMAIL=admin@petopia.com
ADMIN_PASSWORD=
ADMIN_NAME=Clinic Admin
```

`server/.gitignore`:

```
node_modules
dist
.env
```

- [ ] **Step 4: Create the test setup files**

`server/test/setup-env.ts` (runs before every test file, before any import of `src/`):

```ts
process.env.NODE_ENV = "test"
// The real URI comes from mongodb-memory-server (see test/db.ts).
process.env.MONGODB_URI = "mongodb://127.0.0.1:1/unused"
process.env.JWT_ACCESS_SECRET = "test-access-secret-0123456789abcdef0123"
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-0123456789abcdef012"
process.env.CLINIC_TZ = "America/New_York"
process.env.ANY_SLOT_CAPACITY = "2"
process.env.BCRYPT_ROUNDS = "4"
process.env.AUTH_RATE_LIMIT_MAX = "1000"
```

`server/test/db.ts`:

```ts
import { MongoMemoryServer } from "mongodb-memory-server"
import mongoose from "mongoose"
import { afterAll, afterEach, beforeAll } from "vitest"

/** One in-memory MongoDB per test file; collections are emptied between tests. */
export function useTestDb() {
  let server: MongoMemoryServer | undefined

  beforeAll(async () => {
    server = await MongoMemoryServer.create()
    await mongoose.connect(server.getUri())
    // Unique indexes are what enforce slot rules, so they must exist before tests run.
    await Promise.all(
      mongoose.modelNames().map((name) => mongoose.model(name).syncIndexes())
    )
  })

  afterEach(async () => {
    await Promise.all(
      Object.values(mongoose.connection.collections).map((c) => c.deleteMany({}))
    )
  })

  afterAll(async () => {
    await mongoose.disconnect()
    await server?.stop()
  })
}
```

- [ ] **Step 5: Write the failing tests**

`server/test/config.test.ts`:

```ts
import { describe, expect, it } from "vitest"

import { parseEnv } from "../src/config/env"

const valid = {
  MONGODB_URI: "mongodb://127.0.0.1:27017/petopia",
  JWT_ACCESS_SECRET: "a".repeat(32),
  JWT_REFRESH_SECRET: "b".repeat(32),
  CLINIC_TZ: "America/New_York",
}

describe("parseEnv", () => {
  it("applies defaults", () => {
    expect(parseEnv(valid)).toMatchObject({
      NODE_ENV: "development",
      PORT: 4000,
      CLIENT_ORIGIN: "http://localhost:5173",
      ANY_SLOT_CAPACITY: 2,
      BCRYPT_ROUNDS: 12,
      AUTH_RATE_LIMIT_MAX: 10,
    })
  })

  it("requires CLINIC_TZ", () => {
    const { CLINIC_TZ: _omit, ...rest } = valid
    expect(() => parseEnv(rest)).toThrow(/CLINIC_TZ/)
  })

  it("rejects an unknown time zone", () => {
    expect(() => parseEnv({ ...valid, CLINIC_TZ: "Mars/Olympus" })).toThrow(/IANA/)
  })

  it("rejects a short secret", () => {
    expect(() => parseEnv({ ...valid, JWT_ACCESS_SECRET: "short" })).toThrow(
      /JWT_ACCESS_SECRET/
    )
  })

  it("rejects identical secrets", () => {
    expect(() =>
      parseEnv({ ...valid, JWT_REFRESH_SECRET: valid.JWT_ACCESS_SECRET })
    ).toThrow(/JWT_REFRESH_SECRET/)
  })

  it("lists every problem in one readable message", () => {
    expect(() => parseEnv({})).toThrow(/Invalid environment configuration/)
  })
})
```

`server/test/validate.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { z } from "zod"

import { AppError } from "../src/lib/app-error"
import { parse } from "../src/lib/validate"

const schema = z.object({
  name: z.string().min(2, { error: "Too short" }),
  pet: z.object({ age: z.number({ error: "Age is required" }) }),
})

describe("parse", () => {
  it("returns parsed data on success", () => {
    expect(parse(schema, { name: "Jo", pet: { age: 3 } })).toEqual({
      name: "Jo",
      pet: { age: 3 },
    })
  })

  it("throws a 400 VALIDATION_ERROR keyed by field path", () => {
    try {
      parse(schema, { name: "J", pet: {} })
      expect.unreachable()
    } catch (err) {
      expect(err).toBeInstanceOf(AppError)
      const appError = err as AppError
      expect(appError.status).toBe(400)
      expect(appError.code).toBe("VALIDATION_ERROR")
      expect(appError.fields).toEqual({
        name: "Too short",
        "pet.age": "Age is required",
      })
    }
  })
})
```

`server/test/app.test.ts`:

```ts
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
```

- [ ] **Step 6: Run the tests to verify they fail**

Run: `npm --prefix server test`

Expected: FAIL, with modules not found (`../src/config/env`, `../src/app`, …).

- [ ] **Step 7: Implement config, errors, validation**

`server/src/config/env.ts`:

```ts
import { z } from "zod"

function isTimeZone(tz: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz })
    return true
  } catch {
    return false
  }
}

const secret = (name: string) =>
  z
    .string({ error: `${name} is required` })
    .min(32, { error: `${name} must be at least 32 characters` })

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(4000),
    MONGODB_URI: z
      .string({ error: "MONGODB_URI is required" })
      .min(1, { error: "MONGODB_URI is required" }),
    JWT_ACCESS_SECRET: secret("JWT_ACCESS_SECRET"),
    JWT_REFRESH_SECRET: secret("JWT_REFRESH_SECRET"),
    CLIENT_ORIGIN: z.url().default("http://localhost:5173"),
    ANY_SLOT_CAPACITY: z.coerce.number().int().min(1).default(2),
    CLINIC_TZ: z
      .string({ error: "CLINIC_TZ is required (an IANA zone like America/New_York)" })
      .refine(isTimeZone, {
        error: "CLINIC_TZ must be an IANA time zone like America/New_York",
      }),
    BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  })
  .refine((e) => e.JWT_ACCESS_SECRET !== e.JWT_REFRESH_SECRET, {
    path: ["JWT_REFRESH_SECRET"],
    error: "JWT_REFRESH_SECRET must differ from JWT_ACCESS_SECRET",
  })

export type Env = z.output<typeof envSchema>

export function parseEnv(raw: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(raw)
  if (result.success) return result.data
  const lines = result.error.issues.map(
    (issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`
  )
  throw new Error(`Invalid environment configuration:\n${lines.join("\n")}`)
}

export const env = parseEnv(process.env)
```

`server/src/lib/app-error.ts`:

```ts
/** An expected failure with an HTTP status and a stable code for the client. */
export class AppError extends Error {
  readonly status: number
  readonly code: string
  readonly fields?: Record<string, string>

  constructor(
    status: number,
    code: string,
    message: string,
    fields?: Record<string, string>
  ) {
    super(message)
    this.name = "AppError"
    this.status = status
    this.code = code
    this.fields = fields
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      ...(this.fields ? { fields: this.fields } : {}),
    }
  }
}

export const notFound = (what = "Booking") =>
  new AppError(404, "NOT_FOUND", `${what} not found`)

export function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: unknown }).code === 11000
  )
}
```

`server/src/lib/validate.ts`:

```ts
import type { z } from "zod"

import { AppError } from "./app-error"

/** Parses `data` or throws a 400 whose `fields` match the form's field names. */
export function parse<S extends z.ZodType>(schema: S, data: unknown): z.output<S> {
  const result = schema.safeParse(data)
  if (result.success) return result.data

  const fields: Record<string, string> = {}
  for (const issue of result.error.issues) {
    const key = issue.path.join(".") || "_"
    fields[key] ??= issue.message
  }
  throw new AppError(400, "VALIDATION_ERROR", "Please check the highlighted fields", fields)
}
```

- [ ] **Step 8: Implement the error handler, app, DB connect and entry point**

`server/src/middleware/error-handler.ts`:

```ts
import type { ErrorRequestHandler } from "express"
import mongoose from "mongoose"

import { AppError, isDuplicateKeyError } from "../lib/app-error"

function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err
  if (err instanceof mongoose.Error.CastError) {
    return new AppError(404, "NOT_FOUND", "Not found")
  }
  if (isDuplicateKeyError(err)) {
    return new AppError(409, "CONFLICT", "That record already exists")
  }
  const type = (err as { type?: unknown } | null)?.type
  if (type === "entity.parse.failed") {
    return new AppError(400, "INVALID_JSON", "Request body is not valid JSON")
  }
  if (type === "entity.too.large") {
    return new AppError(413, "PAYLOAD_TOO_LARGE", "Request body is too large")
  }
  return new AppError(500, "INTERNAL_ERROR", "Something went wrong. Please try again.")
}

// Express identifies error handlers by their four parameters.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const appError = toAppError(err)
  if (appError.status >= 500) console.error(err)
  res.status(appError.status).json({ error: appError.toJSON() })
}
```

`server/src/app.ts`:

```ts
import cookieParser from "cookie-parser"
import cors from "cors"
import express, { type Express } from "express"
import helmet from "helmet"
import mongoose from "mongoose"

import { env } from "./config/env"
import { AppError } from "./lib/app-error"
import { errorHandler } from "./middleware/error-handler"

export function createApp(): Express {
  const app = express()
  app.set("trust proxy", 1)
  app.use(helmet())
  app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }))
  app.use(express.json({ limit: "10kb" }))
  app.use(cookieParser())

  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    })
  })

  app.use("/api", () => {
    throw new AppError(404, "NOT_FOUND", "Route not found")
  })
  app.use(errorHandler)
  return app
}
```

`server/src/db/connect.ts`:

```ts
import mongoose from "mongoose"

export async function connectDb(uri: string) {
  mongoose.set("strictQuery", true)
  await mongoose.connect(uri)
}
```

`server/src/server.ts`:

```ts
import { createApp } from "./app"
import { env } from "./config/env"
import { connectDb } from "./db/connect"

await connectDb(env.MONGODB_URI)
createApp().listen(env.PORT, () => {
  console.log(`Petopia API listening on http://localhost:${env.PORT}`)
})
```

- [ ] **Step 9: Run tests and typecheck**

Run: `npm --prefix server test && npm --prefix server run typecheck`

Expected: all tests in `config.test.ts`, `validate.test.ts` and `app.test.ts` PASS, and typecheck exits 0.

If typecheck reports zod type mismatches between `shared/` and `server/`, check that `server/node_modules/zod` does **not** exist. Run `npm --prefix server ls zod`, which should print `(empty)`.

- [ ] **Step 10: Commit**

```bash
git add server/package.json server/package-lock.json server/tsconfig.json server/tsup.config.ts server/vitest.config.ts server/.env.example server/.gitignore server/src server/test
git commit -m "feat(server): scaffold Express app with env config and error handling"
```

---

### Task 3: Clinic-time helpers

**Files:**
- Create: `server/src/lib/clinic-time.ts`
- Test: `server/test/clinic-time.test.ts`

**Interfaces:**
- Produces:
  - `todayKey(now?: Date, tz?: string): string`, a "yyyy-MM-dd" date
  - `addDaysKey(dateKey: string, days: number): string`
  - `slotInstant(dateKey: string, time: string, tz?: string): Date`
  - `isPastSlot(dateKey: string, time: string, now?: Date, tz?: string): boolean`
  - `tz` defaults to `env.CLINIC_TZ` and `now` defaults to `new Date()`.

- [ ] **Step 1: Write the failing test**

`server/test/clinic-time.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm --prefix server test -- clinic-time`

Expected: FAIL, "Cannot find module '../src/lib/clinic-time'".

- [ ] **Step 3: Implement `server/src/lib/clinic-time.ts`**

```ts
import { TZDate } from "@date-fns/tz"
import { format } from "date-fns"

import { env } from "../config/env"

// Every "today" / "past" decision is made in the clinic's zone, not the server's.

export function todayKey(now: Date = new Date(), tz: string = env.CLINIC_TZ): string {
  return format(new TZDate(now.getTime(), tz), "yyyy-MM-dd")
}

/** Calendar arithmetic on "yyyy-MM-dd" keys (no time zone involved). */
export function addDaysKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}

export function slotInstant(dateKey: string, time: string, tz: string = env.CLINIC_TZ): Date {
  const [year, month, day] = dateKey.split("-").map(Number)
  const [hours, minutes] = time.split(":").map(Number)
  return new Date(new TZDate(year, month - 1, day, hours, minutes, tz).getTime())
}

export function isPastSlot(
  dateKey: string,
  time: string,
  now: Date = new Date(),
  tz: string = env.CLINIC_TZ
): boolean {
  return slotInstant(dateKey, time, tz).getTime() <= now.getTime()
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm --prefix server test -- clinic-time`

Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add server/src/lib/clinic-time.ts server/test/clinic-time.test.ts
git commit -m "feat(server): add clinic time-zone helpers"
```

---

### Task 4: Auth: users, tokens, register/login/session/refresh/logout

**Files:**
- Create: `server/src/lib/passwords.ts`, `server/src/lib/tokens.ts`, `server/src/lib/auth-cookies.ts`
- Create: `server/src/modules/auth/user.model.ts`, `auth.schemas.ts`, `auth.service.ts`, `auth.routes.ts`
- Modify: `server/src/app.ts`
- Test: `server/test/helpers.ts`, `server/test/auth.test.ts`

**Interfaces:**
- Consumes: `env`, `AppError`, `isDuplicateKeyError`, `parse`, `useTestDb` (Task 2).
- Produces:
  - `ROLES`, `type Role = "owner" | "staff" | "admin"`, `User` model, `UserRecord`, `PublicUser = { id, email, name, phone?, role }`, `toPublicUser(user)`
  - `hashPassword(pw)`, `verifyPassword(pw, hash)`
  - `signAccessToken({ sub, role })`, `verifyAccessToken(token): { sub, role } | null`
  - `ACCESS_COOKIE = "access_token"`, `REFRESH_COOKIE = "refresh_token"`
  - `type Session = { user: PublicUser; expiresAt: number }`
  - `createApp(options?: { authRateLimitMax?: number })`
  - Test helpers: `setCookies(res)`, `createUser(role?, overrides?)`, `signIn(app, role?)`

- [ ] **Step 1: Write the test helpers**

`server/test/helpers.ts`:

```ts
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
```

- [ ] **Step 2: Write the failing tests**

`server/test/auth.test.ts`:

```ts
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
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm --prefix server test -- auth`

Expected: FAIL, with modules not found (`../src/lib/passwords`, `user.model`).

- [ ] **Step 4: Implement the user model and crypto helpers**

`server/src/modules/auth/user.model.ts`:

```ts
import { model, Schema, type Types } from "mongoose"

export const ROLES = ["owner", "staff", "admin"] as const
export type Role = (typeof ROLES)[number]

export interface UserRecord {
  _id: Types.ObjectId
  email: string
  passwordHash: string
  name: string
  phone?: string
  role: Role
  /** Bumped on logout; refresh tokens carrying an older version are rejected. */
  refreshTokenVersion: number
  createdAt: Date
  updatedAt: Date
}

const userSchema = new Schema<UserRecord>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    role: { type: String, enum: [...ROLES], default: "owner" },
    refreshTokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true }
)

export const User = model<UserRecord>("User", userSchema)

export type PublicUser = {
  id: string
  email: string
  name: string
  phone?: string
  role: Role
}

export function toPublicUser(
  user: Pick<UserRecord, "_id" | "email" | "name" | "phone" | "role">
): PublicUser {
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    ...(user.phone ? { phone: user.phone } : {}),
    role: user.role,
  }
}
```

`server/src/lib/passwords.ts`:

```ts
import bcrypt from "bcryptjs"

import { env } from "../config/env"

export const hashPassword = (password: string) => bcrypt.hash(password, env.BCRYPT_ROUNDS)

export const verifyPassword = (password: string, hash: string) =>
  bcrypt.compare(password, hash)

let dummyHash: Promise<string> | undefined

/** Spends the same time as a real check so unknown emails can't be detected by timing. */
export async function burnPasswordCheck(password: string) {
  dummyHash ??= hashPassword("timing-equalizer")
  await bcrypt.compare(password, await dummyHash)
}
```

`server/src/lib/tokens.ts`:

```ts
import { randomUUID } from "node:crypto"
import jwt from "jsonwebtoken"

import { env } from "../config/env"
import { ROLES, type Role } from "../modules/auth/user.model"

export const ACCESS_TTL_SECONDS = 15 * 60
export const REMEMBER_TTL_SECONDS = 7 * 24 * 60 * 60
export const SESSION_TTL_SECONDS = 12 * 60 * 60

export type AccessClaims = { sub: string; role: Role }
/** `exp` is the absolute session end; refreshing never moves it. */
export type RefreshClaims = { sub: string; ver: number; remember: boolean; exp: number }

export function sessionExpiry(remember: boolean, nowMs = Date.now()): number {
  return Math.floor(nowMs / 1000) + (remember ? REMEMBER_TTL_SECONDS : SESSION_TTL_SECONDS)
}

export function signAccessToken(claims: AccessClaims): string {
  return jwt.sign(claims, env.JWT_ACCESS_SECRET, {
    algorithm: "HS256",
    expiresIn: ACCESS_TTL_SECONDS,
  })
}

export function verifyAccessToken(token: string): AccessClaims | null {
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ["HS256"] })
    if (typeof payload === "string" || typeof payload.sub !== "string") return null
    if (!ROLES.includes(payload.role)) return null
    return { sub: payload.sub, role: payload.role as Role }
  } catch {
    return null
  }
}

export function signRefreshToken(claims: RefreshClaims): string {
  // jti makes every rotated token distinct even within the same second.
  return jwt.sign({ ...claims, jti: randomUUID() }, env.JWT_REFRESH_SECRET, {
    algorithm: "HS256",
  })
}

export function verifyRefreshToken(token: string): RefreshClaims | null {
  try {
    const p = jwt.verify(token, env.JWT_REFRESH_SECRET, { algorithms: ["HS256"] })
    if (
      typeof p === "string" ||
      typeof p.sub !== "string" ||
      typeof p.ver !== "number" ||
      typeof p.remember !== "boolean" ||
      typeof p.exp !== "number"
    ) {
      return null
    }
    return { sub: p.sub, ver: p.ver, remember: p.remember, exp: p.exp }
  } catch {
    return null
  }
}
```

`server/src/lib/auth-cookies.ts`:

```ts
import type { Response } from "express"

import { env } from "../config/env"
import { ACCESS_TTL_SECONDS } from "./tokens"

export const ACCESS_COOKIE = "access_token"
export const REFRESH_COOKIE = "refresh_token"
const REFRESH_PATH = "/api/auth"

const baseOptions = () => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env.NODE_ENV === "production",
})

type CookieTokens = {
  accessToken: string
  refreshToken: string
  remember: boolean
  expiresAtSec: number
}

/** Without "remember", cookies have no Max-Age and die with the browser session. */
export function setAuthCookies(res: Response, tokens: CookieTokens) {
  const persist = (maxAgeMs: number) => (tokens.remember ? { maxAge: maxAgeMs } : {})
  res.cookie(ACCESS_COOKIE, tokens.accessToken, {
    ...baseOptions(),
    path: "/",
    ...persist(ACCESS_TTL_SECONDS * 1000),
  })
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    ...baseOptions(),
    path: REFRESH_PATH,
    ...persist(tokens.expiresAtSec * 1000 - Date.now()),
  })
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE, { ...baseOptions(), path: "/" })
  res.clearCookie(REFRESH_COOKIE, { ...baseOptions(), path: REFRESH_PATH })
}
```

- [ ] **Step 5: Implement the auth schemas, service and routes**

`server/src/modules/auth/auth.schemas.ts`:

```ts
import { phoneSchema } from "@shared/booking-schema"
import { z } from "zod"

const email = z
  .string({ error: "Enter a valid email" })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Enter a valid email" }))

export const registerSchema = z.object({
  name: z
    .string({ error: "Enter your name" })
    .trim()
    .min(2, { error: "Enter your name" })
    .max(80, { error: "Name is too long" }),
  email,
  password: z
    .string({ error: "Choose a password" })
    .min(8, { error: "Use at least 8 characters" })
    .max(128, { error: "Use at most 128 characters" }),
  phone: phoneSchema.optional(),
})

export const loginSchema = z.object({
  email: z.string({ error: "Enter your email" }).trim().toLowerCase(),
  password: z.string({ error: "Enter your password" }).min(1, { error: "Enter your password" }),
  remember: z.boolean().default(false),
})

export type RegisterInput = z.output<typeof registerSchema>
export type LoginInput = z.output<typeof loginSchema>
```

`server/src/modules/auth/auth.service.ts`:

```ts
import { AppError, isDuplicateKeyError } from "../../lib/app-error"
import { burnPasswordCheck, hashPassword, verifyPassword } from "../../lib/passwords"
import {
  sessionExpiry,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  type RefreshClaims,
} from "../../lib/tokens"
import type { LoginInput, RegisterInput } from "./auth.schemas"
import { toPublicUser, User, type PublicUser, type UserRecord } from "./user.model"

/** Matches the frontend's AuthSession; expiresAt is epoch ms. */
export type Session = { user: PublicUser; expiresAt: number }

export type IssuedSession = {
  session: Session
  accessToken: string
  refreshToken: string
  remember: boolean
  expiresAtSec: number
}

const invalidCredentials = () =>
  new AppError(401, "INVALID_CREDENTIALS", "Incorrect email or password")
const unauthenticated = () =>
  new AppError(401, "UNAUTHENTICATED", "Your session has expired. Please sign in again.")

function issue(user: UserRecord, remember: boolean, expiresAtSec: number): IssuedSession {
  const id = user._id.toString()
  return {
    session: { user: toPublicUser(user), expiresAt: expiresAtSec * 1000 },
    accessToken: signAccessToken({ sub: id, role: user.role }),
    refreshToken: signRefreshToken({
      sub: id,
      ver: user.refreshTokenVersion,
      remember,
      exp: expiresAtSec,
    }),
    remember,
    expiresAtSec,
  }
}

export async function register(input: RegisterInput): Promise<IssuedSession> {
  const { password, ...profile } = input
  try {
    const user = await User.create({
      ...profile,
      role: "owner",
      passwordHash: await hashPassword(password),
    })
    return issue(user, true, sessionExpiry(true))
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      throw new AppError(409, "EMAIL_TAKEN", "An account with this email already exists", {
        email: "An account with this email already exists",
      })
    }
    throw err
  }
}

export async function login({ email, password, remember }: LoginInput): Promise<IssuedSession> {
  const user = await User.findOne({ email }).select("+passwordHash")
  if (!user) {
    await burnPasswordCheck(password)
    throw invalidCredentials()
  }
  if (!(await verifyPassword(password, user.passwordHash))) throw invalidCredentials()
  return issue(user, remember, sessionExpiry(remember))
}

async function resolveRefresh(
  token: string | undefined
): Promise<{ user: UserRecord; claims: RefreshClaims }> {
  const claims = token ? verifyRefreshToken(token) : null
  if (!claims) throw unauthenticated()
  const user = await User.findById(claims.sub)
  if (!user || user.refreshTokenVersion !== claims.ver) throw unauthenticated()
  return { user, claims }
}

export async function refresh(token: string | undefined): Promise<IssuedSession> {
  const { user, claims } = await resolveRefresh(token)
  return issue(user, claims.remember, claims.exp)
}

export async function getSession(token: string | undefined): Promise<Session> {
  const { user, claims } = await resolveRefresh(token)
  return { user: toPublicUser(user), expiresAt: claims.exp * 1000 }
}

/** Revokes every refresh token for the user (all devices). */
export async function logout(token: string | undefined): Promise<void> {
  const claims = token ? verifyRefreshToken(token) : null
  if (!claims) return
  await User.updateOne(
    { _id: claims.sub, refreshTokenVersion: claims.ver },
    { $inc: { refreshTokenVersion: 1 } }
  )
}
```

`server/src/modules/auth/auth.routes.ts`:

```ts
import { Router, type Request } from "express"
import { rateLimit } from "express-rate-limit"

import { AppError } from "../../lib/app-error"
import { clearAuthCookies, REFRESH_COOKIE, setAuthCookies } from "../../lib/auth-cookies"
import { parse } from "../../lib/validate"
import { loginSchema, registerSchema } from "./auth.schemas"
import * as auth from "./auth.service"

function refreshCookie(req: Request): string | undefined {
  const value: unknown = req.cookies?.[REFRESH_COOKIE]
  return typeof value === "string" ? value : undefined
}

export function createAuthRouter({ rateLimitMax }: { rateLimitMax: number }) {
  const router = Router()
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: rateLimitMax,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (_req, _res, next) =>
      next(new AppError(429, "RATE_LIMITED", "Too many attempts. Please try again in a few minutes.")),
  })

  router.post("/register", limiter, async (req, res) => {
    const issued = await auth.register(parse(registerSchema, req.body))
    setAuthCookies(res, issued)
    res.status(201).json(issued.session)
  })

  router.post("/login", limiter, async (req, res) => {
    const issued = await auth.login(parse(loginSchema, req.body))
    setAuthCookies(res, issued)
    res.json(issued.session)
  })

  router.post("/refresh", async (req, res) => {
    try {
      const issued = await auth.refresh(refreshCookie(req))
      setAuthCookies(res, issued)
      res.json(issued.session)
    } catch (err) {
      clearAuthCookies(res)
      throw err
    }
  })

  router.get("/session", async (req, res) => {
    res.json(await auth.getSession(refreshCookie(req)))
  })

  router.post("/logout", async (req, res) => {
    await auth.logout(refreshCookie(req))
    clearAuthCookies(res)
    res.status(204).end()
  })

  return router
}
```

- [ ] **Step 6: Mount the router in `server/src/app.ts`**

Replace the whole file:

```ts
import cookieParser from "cookie-parser"
import cors from "cors"
import express, { type Express } from "express"
import helmet from "helmet"
import mongoose from "mongoose"

import { env } from "./config/env"
import { AppError } from "./lib/app-error"
import { errorHandler } from "./middleware/error-handler"
import { createAuthRouter } from "./modules/auth/auth.routes"

export type AppOptions = { authRateLimitMax?: number }

export function createApp({
  authRateLimitMax = env.AUTH_RATE_LIMIT_MAX,
}: AppOptions = {}): Express {
  const app = express()
  app.set("trust proxy", 1)
  app.use(helmet())
  app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }))
  app.use(express.json({ limit: "10kb" }))
  app.use(cookieParser())

  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    })
  })
  app.use("/api/auth", createAuthRouter({ rateLimitMax: authRateLimitMax }))

  app.use("/api", () => {
    throw new AppError(404, "NOT_FOUND", "Route not found")
  })
  app.use(errorHandler)
  return app
}
```

- [ ] **Step 7: Run tests and typecheck**

Run: `npm --prefix server test && npm --prefix server run typecheck`

Expected: all tests PASS, including the 13 in `auth.test.ts`, and typecheck exits 0.

- [ ] **Step 8: Commit**

```bash
git add server/src/lib/passwords.ts server/src/lib/tokens.ts server/src/lib/auth-cookies.ts server/src/modules/auth server/src/app.ts server/test/helpers.ts server/test/auth.test.ts
git commit -m "feat(server): add cookie-based JWT auth with register, login, refresh, logout"
```

---

### Task 5: Auth guards + admin seed script

**Files:**
- Create: `server/src/middleware/auth.ts`, `server/src/types/express.d.ts`, `server/scripts/seed-admin.ts`
- Modify: `server/src/app.ts` (add `attachUser`)
- Test: `server/test/auth-guards.test.ts`

**Interfaces:**
- Consumes: `verifyAccessToken`, `ACCESS_COOKIE`, `Role`, `AppError`, `errorHandler`.
- Produces:
  - `attachUser: RequestHandler`, which sets `req.user?: { id: string; role: Role }`
  - `currentUser(req): { id; role }`, which throws `401 UNAUTHENTICATED`
  - `requireRole(...roles: Role[]): RequestHandler`, which returns `401` or `403 FORBIDDEN`

- [ ] **Step 1: Write the failing test**

`server/test/auth-guards.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm --prefix server test -- auth-guards`

Expected: FAIL, "Cannot find module '../src/middleware/auth'".

- [ ] **Step 3: Implement the guards and the `Request` typing**

`server/src/types/express.d.ts`:

```ts
import type { Role } from "../modules/auth/user.model"

declare global {
  namespace Express {
    interface Request {
      /** Set by attachUser when a valid access cookie is present. */
      user?: { id: string; role: Role }
    }
  }
}

export {}
```

`server/src/middleware/auth.ts`:

```ts
import type { Request, RequestHandler } from "express"

import { AppError } from "../lib/app-error"
import { ACCESS_COOKIE } from "../lib/auth-cookies"
import { verifyAccessToken } from "../lib/tokens"
import type { Role } from "../modules/auth/user.model"

const unauthenticated = () => new AppError(401, "UNAUTHENTICATED", "Please sign in")

/** Optional auth: an invalid or expired cookie is ignored (the client refreshes on 401). */
export const attachUser: RequestHandler = (req, _res, next) => {
  const token: unknown = req.cookies?.[ACCESS_COOKIE]
  if (typeof token === "string") {
    const claims = verifyAccessToken(token)
    if (claims) req.user = { id: claims.sub, role: claims.role }
  }
  next()
}

export function currentUser(req: Request): { id: string; role: Role } {
  if (!req.user) throw unauthenticated()
  return req.user
}

export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    const user = currentUser(req)
    if (!roles.includes(user.role)) {
      throw new AppError(403, "FORBIDDEN", "You don't have access to this")
    }
    next()
  }
}
```

- [ ] **Step 4: Add `attachUser` to `server/src/app.ts`**

Add the import next to the other middleware import:

```ts
import { attachUser } from "./middleware/auth"
```

and add this line directly after `app.use(cookieParser())`:

```ts
  app.use(attachUser)
```

- [ ] **Step 5: Create `server/scripts/seed-admin.ts`**

```ts
// Creates or updates the admin account from ADMIN_* env vars: npm run seed:admin
import mongoose from "mongoose"
import { z } from "zod"

import { env } from "../src/config/env"
import { connectDb } from "../src/db/connect"
import { hashPassword } from "../src/lib/passwords"
import { User } from "../src/modules/auth/user.model"

const admin = z
  .object({
    ADMIN_EMAIL: z.string().trim().toLowerCase().pipe(z.email()),
    ADMIN_PASSWORD: z.string().min(8, { error: "ADMIN_PASSWORD must be at least 8 characters" }),
    ADMIN_NAME: z.string().trim().min(2).default("Clinic Admin"),
  })
  .parse(process.env)

await connectDb(env.MONGODB_URI)
await User.findOneAndUpdate(
  { email: admin.ADMIN_EMAIL },
  {
    $set: {
      name: admin.ADMIN_NAME,
      role: "admin",
      passwordHash: await hashPassword(admin.ADMIN_PASSWORD),
    },
    // A reseed (e.g. a password change) signs out existing admin sessions.
    $inc: { refreshTokenVersion: 1 },
  },
  { upsert: true }
)
console.log(`Admin ready: ${admin.ADMIN_EMAIL}`)
await mongoose.disconnect()
```

- [ ] **Step 6: Run tests and typecheck**

Run: `npm --prefix server test && npm --prefix server run typecheck`

Expected: all PASS; typecheck exits 0.

- [ ] **Step 7: Commit**

```bash
git add server/src/middleware/auth.ts server/src/types/express.d.ts server/src/app.ts server/scripts/seed-admin.ts server/test/auth-guards.test.ts
git commit -m "feat(server): add auth guards and admin seed script"
```

---

### Task 6: Booking model, slot rules, create endpoint

**Files:**
- Create: `server/src/lib/object-id.ts`
- Create: `server/src/modules/bookings/booking.model.ts`, `slot-counter.model.ts`, `slots.ts`, `booking.serializer.ts`, `bookings.service.ts`, `bookings.routes.ts`
- Modify: `server/src/app.ts`, `server/test/helpers.ts`
- Test: `server/test/bookings.test.ts`

**Interfaces:**
- Consumes: `bookingRequestSchema`, `BookingRequest` and the enums from `@shared/booking-schema`; `isPastSlot`, `todayKey`, `addDaysKey`; `currentUser`; `parse`.
- Produces:
  - `Booking` model, `BookingRecord`
  - `SlotCounter` model
  - `holdsSlot(status): boolean`
  - `withSlot<T>(ref: SlotRef, write: (slotFields: { specialistSlotKey?: string }) => Promise<T>): Promise<T>`
  - `releaseAnySlot(ref: SlotRef): Promise<void>`
  - `slotTaken(): AppError`
  - `toBookingDto(b): BookingDto`, `toOwnerBookingDto(b): OwnerBookingDto`
  - `createBooking(input, userId?, now?): Promise<BookingRecord>`
  - `parseObjectId(id): string`, which throws `404` for malformed ids
  - `objectIdSchema`
  - `bookingsRouter`
  - Test helpers: `inDays(n)`, `bookingBody(overrides?)`, `rawBooking(overrides?)`, `insertBookings(docs)`

- [ ] **Step 1: Extend `server/test/helpers.ts`**

Add these imports at the top:

```ts
import { Types } from "mongoose"

import { addDaysKey, todayKey } from "../src/lib/clinic-time"
import { Booking, type BookingRecord } from "../src/modules/bookings/booking.model"
```

and append:

```ts
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
```

- [ ] **Step 2: Write the failing tests**

`server/test/bookings.test.ts`:

```ts
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
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm --prefix server test -- bookings.test`

Expected: FAIL, "Cannot find module '../src/modules/bookings/booking.model'".

- [ ] **Step 4: Implement the models**

`server/src/modules/bookings/booking.model.ts`:

```ts
import {
  BOOKING_STATUSES,
  PET_TYPES,
  SERVICE_VALUES,
  SPECIALIST_VALUES,
  TIME_SLOTS,
  type BookingStatus,
  type PetType,
  type ServiceValue,
  type SpecialistValue,
  type TimeSlot,
} from "@shared/booking-schema"
import { model, Schema, type Types } from "mongoose"

export interface BookingRecord {
  _id: Types.ObjectId
  petType: PetType
  service: ServiceValue
  specialist: SpecialistValue
  /** "yyyy-MM-dd", clinic-local day */
  date: string
  time: TimeSlot
  fullName: string
  phone: string
  /** `phone` without formatting, for search */
  phoneDigits: string
  petInfo: string
  status: BookingStatus
  notes: string
  userId?: Types.ObjectId
  /** "date|time|specialist" while a named-specialist booking holds its slot */
  specialistSlotKey?: string
  createdAt: Date
  updatedAt: Date
}

const bookingSchema = new Schema<BookingRecord>(
  {
    petType: { type: String, enum: [...PET_TYPES], required: true },
    service: { type: String, enum: [...SERVICE_VALUES], required: true },
    specialist: { type: String, enum: [...SPECIALIST_VALUES], required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    time: { type: String, enum: [...TIME_SLOTS], required: true },
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    phoneDigits: { type: String, required: true },
    petInfo: { type: String, required: true },
    status: { type: String, enum: [...BOOKING_STATUSES], default: "pending" },
    notes: { type: String, default: "", maxlength: 2000 },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    specialistSlotKey: { type: String },
  },
  { timestamps: true }
)

// The double-booking guard for named specialists: MongoDB rejects a second holder.
bookingSchema.index(
  { specialistSlotKey: 1 },
  { unique: true, partialFilterExpression: { specialistSlotKey: { $exists: true } } }
)
bookingSchema.index({ date: 1, time: 1 })
bookingSchema.index({ createdAt: -1 })
bookingSchema.index({ userId: 1, date: -1 })

export const Booking = model<BookingRecord>("Booking", bookingSchema)
```

`server/src/modules/bookings/slot-counter.model.ts`:

```ts
import { model, Schema } from "mongoose"

/** How many "any available" bookings hold each date+time slot. */
export interface SlotCounterRecord {
  date: string
  time: string
  anyCount: number
}

const slotCounterSchema = new Schema<SlotCounterRecord>({
  date: { type: String, required: true },
  time: { type: String, required: true },
  anyCount: { type: Number, default: 0, min: 0 },
})
slotCounterSchema.index({ date: 1, time: 1 }, { unique: true })

export const SlotCounter = model<SlotCounterRecord>("SlotCounter", slotCounterSchema)
```

- [ ] **Step 5: Implement the slot rules**

`server/src/modules/bookings/slots.ts`:

```ts
import type { BookingStatus } from "@shared/booking-schema"

import { env } from "../../config/env"
import { AppError, isDuplicateKeyError } from "../../lib/app-error"
import type { BookingRecord } from "./booking.model"
import { SlotCounter } from "./slot-counter.model"

// The single place that enforces double-booking rules. Every path that makes a
// booking start or stop holding its slot goes through withSlot / releaseAnySlot.

export type SlotRef = Pick<BookingRecord, "date" | "time" | "specialist">
export type SlotFields = { specialistSlotKey?: string }

export const holdsSlot = (status: BookingStatus) => status !== "cancelled"

export const slotTaken = () =>
  new AppError(409, "SLOT_TAKEN", "That time slot was just booked. Please pick another.", {
    time: "That time slot is no longer available",
  })

async function reserveAnySlot({ date, time }: SlotRef) {
  try {
    await SlotCounter.updateOne(
      { date, time },
      { $setOnInsert: { anyCount: 0 } },
      { upsert: true }
    )
  } catch (err) {
    // A concurrent request created the counter first; that's fine.
    if (!isDuplicateKeyError(err)) throw err
  }
  const reserved = await SlotCounter.updateOne(
    { date, time, anyCount: { $lt: env.ANY_SLOT_CAPACITY } },
    { $inc: { anyCount: 1 } }
  )
  if (reserved.modifiedCount === 0) throw slotTaken()
}

export async function releaseAnySlot({ date, time }: SlotRef) {
  await SlotCounter.updateOne(
    { date, time, anyCount: { $gt: 0 } },
    { $inc: { anyCount: -1 } }
  )
}

/**
 * Reserves the slot, then runs `write` with the fields the booking must store.
 * If `write` fails, the reservation is undone; a duplicate key becomes SLOT_TAKEN.
 */
export async function withSlot<T>(
  ref: SlotRef,
  write: (slotFields: SlotFields) => Promise<T>
): Promise<T> {
  const isAny = ref.specialist === "any"
  if (isAny) await reserveAnySlot(ref)
  const slotFields: SlotFields = isAny
    ? {}
    : { specialistSlotKey: `${ref.date}|${ref.time}|${ref.specialist}` }
  try {
    return await write(slotFields)
  } catch (err) {
    if (isAny) await releaseAnySlot(ref)
    if (isDuplicateKeyError(err)) throw slotTaken()
    throw err
  }
}
```

- [ ] **Step 6: Implement the serializer, ObjectId helper, service and routes**

`server/src/lib/object-id.ts`:

```ts
import { z } from "zod"

import { notFound } from "./app-error"

export const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, { error: "Invalid id" })

/** Malformed ids are treated like unknown ones: 404, no information leak. */
export function parseObjectId(id: string, what = "Booking"): string {
  if (!objectIdSchema.safeParse(id).success) throw notFound(what)
  return id
}
```

`server/src/modules/bookings/booking.serializer.ts`:

```ts
import type { BookingRecord } from "./booking.model"

/** Exactly the frontend's `Booking` type (src/types/booking.ts). */
export type BookingDto = {
  id: string
  createdAt: string
  updatedAt: string
  status: BookingRecord["status"]
  notes: string
  petType: BookingRecord["petType"]
  service: BookingRecord["service"]
  specialist: BookingRecord["specialist"]
  date: string
  time: BookingRecord["time"]
  fullName: string
  phone: string
  petInfo: string
}

export type OwnerBookingDto = Omit<BookingDto, "notes">

export function toBookingDto(b: BookingRecord): BookingDto {
  return {
    id: b._id.toString(),
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
    status: b.status,
    notes: b.notes,
    petType: b.petType,
    service: b.service,
    specialist: b.specialist,
    date: b.date,
    time: b.time,
    fullName: b.fullName,
    phone: b.phone,
    petInfo: b.petInfo,
  }
}

/** Staff notes are internal and never shown to pet owners. */
export function toOwnerBookingDto(b: BookingRecord): OwnerBookingDto {
  const dto: Partial<BookingDto> = toBookingDto(b)
  delete dto.notes
  return dto as OwnerBookingDto
}
```

`server/src/modules/bookings/bookings.service.ts`:

```ts
import type { BookingRequest } from "@shared/booking-schema"

import { AppError } from "../../lib/app-error"
import { isPastSlot } from "../../lib/clinic-time"
import { Booking, type BookingRecord } from "./booking.model"
import { withSlot } from "./slots"

export async function createBooking(
  input: BookingRequest,
  userId?: string,
  now: Date = new Date()
): Promise<BookingRecord> {
  if (isPastSlot(input.date, input.time, now)) {
    throw new AppError(400, "SLOT_IN_PAST", "That time has already passed", {
      time: "That time has already passed",
    })
  }
  const doc = await withSlot(input, (slotFields) =>
    Booking.create({
      ...input,
      ...slotFields,
      phoneDigits: input.phone.replace(/\D/g, ""),
      ...(userId ? { userId } : {}),
    })
  )
  return doc.toObject()
}
```

`server/src/modules/bookings/bookings.routes.ts`:

```ts
import { bookingRequestSchema } from "@shared/booking-schema"
import { Router } from "express"

import { parse } from "../../lib/validate"
import { toBookingDto } from "./booking.serializer"
import { createBooking } from "./bookings.service"

export const bookingsRouter = Router()

// Public: guests may book; a signed-in user's id is attached when present.
bookingsRouter.post("/", async (req, res) => {
  const booking = await createBooking(parse(bookingRequestSchema, req.body), req.user?.id)
  res.status(201).json(toBookingDto(booking))
})
```

- [ ] **Step 7: Mount the router in `server/src/app.ts`**

Add the import:

```ts
import { bookingsRouter } from "./modules/bookings/bookings.routes"
```

and add this line directly after the `/api/auth` mount:

```ts
  app.use("/api/bookings", bookingsRouter)
```

- [ ] **Step 8: Run tests and typecheck**

Run: `npm --prefix server test && npm --prefix server run typecheck`

Expected: all PASS, including the 10 tests in `bookings.test.ts`; typecheck exits 0.

- [ ] **Step 9: Commit**

```bash
git add server/src/lib/object-id.ts server/src/modules/bookings server/src/app.ts server/test/helpers.ts server/test/bookings.test.ts
git commit -m "feat(server): add bookings with race-safe double-booking protection"
```

---

### Task 7: Availability, "my bookings", owner cancel

**Files:**
- Modify: `server/src/modules/bookings/bookings.service.ts`, `server/src/modules/bookings/bookings.routes.ts`
- Test: `server/test/bookings-owner.test.ts`

**Interfaces:**
- Consumes: `withSlot`, `releaseAnySlot`, `SlotCounter`, `currentUser`, `parseObjectId`, `dateKeySchema`, `SPECIALIST_VALUES`, `TIME_SLOTS`.
- Produces:
  - `getAvailability(date, specialist, now?): Promise<{ date: string; slots: { time: TimeSlot; available: boolean }[] }>`
  - `listOwnBookings(userId): Promise<BookingRecord[]>`
  - `cancelOwnBooking(id, userId, now?): Promise<BookingRecord>`

- [ ] **Step 1: Write the failing tests**

`server/test/bookings-owner.test.ts`:

```ts
import request from "supertest"
import { describe, expect, it } from "vitest"

import { createApp } from "../src/app"
import { Booking } from "../src/modules/bookings/booking.model"
import { SlotCounter } from "../src/modules/bookings/slot-counter.model"
import { useTestDb } from "./db"
import { bookingBody, inDays, rawBooking, insertBookings, signIn } from "./helpers"

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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm --prefix server test -- bookings-owner`

Expected: FAIL, because the routes return 404 NOT_FOUND ("Route not found").

- [ ] **Step 3: Add the service functions**

Append to `server/src/modules/bookings/bookings.service.ts`, and add the new imports to its import block:

```ts
import { TIME_SLOTS, type SpecialistValue, type TimeSlot } from "@shared/booking-schema"

import { env } from "../../config/env"
import { notFound } from "../../lib/app-error"
import { parseObjectId } from "../../lib/object-id"
import { SlotCounter } from "./slot-counter.model"
import { releaseAnySlot } from "./slots"
```

```ts
export async function getAvailability(
  date: string,
  specialist: SpecialistValue,
  now: Date = new Date()
): Promise<{ date: string; slots: { time: TimeSlot; available: boolean }[] }> {
  let taken: Set<string>
  if (specialist === "any") {
    const counters = await SlotCounter.find({ date }).lean()
    taken = new Set(
      counters.filter((c) => c.anyCount >= env.ANY_SLOT_CAPACITY).map((c) => c.time)
    )
  } else {
    const holders = await Booking.find(
      { date, specialist, specialistSlotKey: { $exists: true } },
      { time: 1 }
    ).lean()
    taken = new Set(holders.map((b) => b.time))
  }
  return {
    date,
    slots: TIME_SLOTS.map((time) => ({
      time,
      available: !taken.has(time) && !isPastSlot(date, time, now),
    })),
  }
}

export async function listOwnBookings(userId: string): Promise<BookingRecord[]> {
  return Booking.find({ userId }).sort({ date: -1, time: -1, _id: -1 }).lean()
}

const notCancellable = () =>
  new AppError(409, "NOT_CANCELLABLE", "This booking can no longer be cancelled")

export async function cancelOwnBooking(
  id: string,
  userId: string,
  now: Date = new Date()
): Promise<BookingRecord> {
  const existing = await Booking.findOne({ _id: parseObjectId(id), userId }).lean()
  if (!existing) throw notFound()
  const cancellable = existing.status === "pending" || existing.status === "confirmed"
  if (!cancellable || isPastSlot(existing.date, existing.time, now)) throw notCancellable()

  // Guarding on the old status makes the transition (and the slot release) happen once.
  const updated = await Booking.findOneAndUpdate(
    { _id: existing._id, userId, status: existing.status },
    { $set: { status: "cancelled" }, $unset: { specialistSlotKey: 1 } },
    { new: true }
  ).lean()
  if (!updated) throw notCancellable()
  if (updated.specialist === "any") await releaseAnySlot(updated)
  return updated
}
```

- [ ] **Step 4: Add the routes**

Replace `server/src/modules/bookings/bookings.routes.ts` with:

```ts
import { bookingRequestSchema, dateKeySchema, SPECIALIST_VALUES } from "@shared/booking-schema"
import { Router } from "express"
import { z } from "zod"

import { parse } from "../../lib/validate"
import { currentUser } from "../../middleware/auth"
import { toBookingDto, toOwnerBookingDto } from "./booking.serializer"
import {
  cancelOwnBooking,
  createBooking,
  getAvailability,
  listOwnBookings,
} from "./bookings.service"

const availabilityQuerySchema = z.object({
  date: dateKeySchema,
  specialist: z.enum(SPECIALIST_VALUES).default("any"),
})

export const bookingsRouter = Router()

// Public: guests may book; a signed-in user's id is attached when present.
bookingsRouter.post("/", async (req, res) => {
  const booking = await createBooking(parse(bookingRequestSchema, req.body), req.user?.id)
  res.status(201).json(toBookingDto(booking))
})

bookingsRouter.get("/availability", async (req, res) => {
  const { date, specialist } = parse(availabilityQuerySchema, req.query)
  res.json(await getAvailability(date, specialist))
})

bookingsRouter.get("/mine", async (req, res) => {
  const bookings = await listOwnBookings(currentUser(req).id)
  res.json(bookings.map(toOwnerBookingDto))
})

bookingsRouter.patch("/:id/cancel", async (req, res) => {
  const booking = await cancelOwnBooking(req.params.id, currentUser(req).id)
  res.json(toOwnerBookingDto(booking))
})
```

- [ ] **Step 5: Run tests and typecheck**

Run: `npm --prefix server test && npm --prefix server run typecheck`

Expected: all PASS, including the 10 tests in `bookings-owner.test.ts`; typecheck exits 0.

- [ ] **Step 6: Commit**

```bash
git add server/src/modules/bookings/bookings.service.ts server/src/modules/bookings/bookings.routes.ts server/test/bookings-owner.test.ts
git commit -m "feat(server): add availability, my bookings and owner cancellation"
```

---

### Task 8: Staff listing: list, export, get

**Files:**
- Create: `server/src/modules/admin/admin-bookings.schemas.ts`, `admin-bookings.service.ts`, `admin-bookings.routes.ts`
- Modify: `server/src/app.ts`
- Test: `server/test/admin-list.test.ts`

**Interfaces:**
- Consumes: `Booking`, `toBookingDto`, `parseObjectId`, `requireRole`, `parse`, `dateKeySchema`, `BOOKING_STATUSES`, `SERVICE_VALUES`, `PET_TYPES`.
- Produces:
  - `filtersSchema`, `listQuerySchema`, `BOOKING_SORTS`, `type Filters`, `type ListQuery`
  - `listBookings(q): Promise<{ items: BookingDto[]; total; page; pageSize }>`
  - `exportBookings(q, limit = EXPORT_LIMIT): Promise<BookingDto[]>`
  - `getBooking(id): Promise<BookingDto>`
  - `adminBookingsRouter`

- [ ] **Step 1: Write the failing tests**

`server/test/admin-list.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm --prefix server test -- admin-list`

Expected: FAIL, "Cannot find module '../src/modules/admin/admin-bookings.service'".

- [ ] **Step 3: Implement the schemas**

`server/src/modules/admin/admin-bookings.schemas.ts`:

```ts
import {
  BOOKING_STATUSES,
  dateKeySchema,
  PET_TYPES,
  SERVICE_VALUES,
} from "@shared/booking-schema"
import { z } from "zod"

export const BOOKING_SORTS = ["date-asc", "date-desc", "created-asc", "created-desc"] as const
export type BookingSort = (typeof BOOKING_SORTS)[number]

/** Accepts `?status=a&status=b` and `?status=a,b`. */
function toList(value: unknown) {
  if (value === undefined || value === "") return undefined
  const raw = Array.isArray(value) ? value : [value]
  const items = raw.flatMap((v) => String(v).split(",")).map((v) => v.trim()).filter(Boolean)
  return items.length ? items : undefined
}

const listOf = <T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess(toList, z.array(z.enum(values)).optional())

const emptyAsUndefined = (value: unknown) => (value === "" ? undefined : value)

export const filtersSchema = z.object({
  search: z.preprocess(emptyAsUndefined, z.string().trim().max(100).optional()),
  status: listOf(BOOKING_STATUSES),
  service: listOf(SERVICE_VALUES),
  petType: listOf(PET_TYPES),
  from: z.preprocess(emptyAsUndefined, dateKeySchema.optional()),
  to: z.preprocess(emptyAsUndefined, dateKeySchema.optional()),
  sort: z.preprocess(emptyAsUndefined, z.enum(BOOKING_SORTS).default("date-desc")),
})

export const listQuerySchema = filtersSchema.extend({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
})

export type Filters = z.output<typeof filtersSchema>
export type ListQuery = z.output<typeof listQuerySchema>
```

- [ ] **Step 4: Implement the service**

`server/src/modules/admin/admin-bookings.service.ts`:

```ts
import type { FilterQuery } from "mongoose"

import { AppError, notFound } from "../../lib/app-error"
import { parseObjectId } from "../../lib/object-id"
import { Booking, type BookingRecord } from "../bookings/booking.model"
import { toBookingDto, type BookingDto } from "../bookings/booking.serializer"
import type { BookingSort, Filters, ListQuery } from "./admin-bookings.schemas"

export const EXPORT_LIMIT = 5000

const SORTS: Record<BookingSort, Record<string, 1 | -1>> = {
  "date-asc": { date: 1, time: 1, _id: 1 },
  "date-desc": { date: -1, time: -1, _id: -1 },
  "created-asc": { createdAt: 1, _id: 1 },
  "created-desc": { createdAt: -1, _id: -1 },
}

const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

/** Same semantics as the dashboard's mock (src/services/bookings/mock-bookings-service.ts). */
function buildFilter(q: Filters): FilterQuery<BookingRecord> {
  const filter: FilterQuery<BookingRecord> = {}
  if (q.status?.length) filter.status = { $in: q.status }
  if (q.service?.length) filter.service = { $in: q.service }
  if (q.petType?.length) filter.petType = { $in: q.petType }
  if (q.from || q.to) {
    filter.date = { ...(q.from ? { $gte: q.from } : {}), ...(q.to ? { $lte: q.to } : {}) }
  }
  const search = q.search?.trim()
  if (search) {
    const text = { $regex: escapeRegex(search), $options: "i" }
    const digits = search.replace(/\D/g, "")
    filter.$or = [
      { fullName: text },
      { petInfo: text },
      ...(digits ? [{ phoneDigits: { $regex: digits } }] : []),
    ]
  }
  return filter
}

export async function listBookings(q: ListQuery) {
  const filter = buildFilter(q)
  const [items, total] = await Promise.all([
    Booking.find(filter)
      .sort(SORTS[q.sort])
      .skip((q.page - 1) * q.pageSize)
      .limit(q.pageSize)
      .lean(),
    Booking.countDocuments(filter),
  ])
  return { items: items.map(toBookingDto), total, page: q.page, pageSize: q.pageSize }
}

export async function exportBookings(q: Filters, limit = EXPORT_LIMIT): Promise<BookingDto[]> {
  const filter = buildFilter(q)
  if ((await Booking.countDocuments(filter)) > limit) {
    throw new AppError(
      400,
      "EXPORT_TOO_LARGE",
      `Export is limited to ${limit} bookings. Narrow the filters and try again.`
    )
  }
  const items = await Booking.find(filter).sort(SORTS[q.sort]).lean()
  return items.map(toBookingDto)
}

export async function getBooking(id: string): Promise<BookingDto> {
  const doc = await Booking.findById(parseObjectId(id)).lean()
  if (!doc) throw notFound()
  return toBookingDto(doc)
}
```

- [ ] **Step 5: Implement the routes and mount them**

`server/src/modules/admin/admin-bookings.routes.ts`:

```ts
import { Router } from "express"

import { parse } from "../../lib/validate"
import { filtersSchema, listQuerySchema } from "./admin-bookings.schemas"
import { exportBookings, getBooking, listBookings } from "./admin-bookings.service"

// Mounted behind requireRole("staff", "admin") in app.ts.
export const adminBookingsRouter = Router()

adminBookingsRouter.get("/", async (req, res) => {
  res.json(await listBookings(parse(listQuerySchema, req.query)))
})

adminBookingsRouter.get("/export", async (req, res) => {
  res.json(await exportBookings(parse(filtersSchema, req.query)))
})

adminBookingsRouter.get("/:id", async (req, res) => {
  res.json(await getBooking(req.params.id))
})
```

In `server/src/app.ts`, change the middleware import to `import { attachUser, requireRole } from "./middleware/auth"`, then add:

```ts
import { adminBookingsRouter } from "./modules/admin/admin-bookings.routes"
```

and add this line directly after the `/api/bookings` mount:

```ts
  app.use("/api/admin/bookings", requireRole("staff", "admin"), adminBookingsRouter)
```

- [ ] **Step 6: Run tests and typecheck**

Run: `npm --prefix server test && npm --prefix server run typecheck`

Expected: all PASS, including the 9 tests in `admin-list.test.ts`; typecheck exits 0.

- [ ] **Step 7: Commit**

```bash
git add server/src/modules/admin server/src/app.ts server/test/admin-list.test.ts
git commit -m "feat(server): add staff booking list, export and detail endpoints"
```

---

### Task 9: Staff mutations: bulk status, notes, bulk delete

**Files:**
- Modify: `server/src/modules/admin/admin-bookings.schemas.ts`, `admin-bookings.service.ts`, `admin-bookings.routes.ts`
- Test: `server/test/admin-mutations.test.ts`

**Interfaces:**
- Consumes: `withSlot`, `releaseAnySlot`, `holdsSlot`, `objectIdSchema`, `parseObjectId`.
- Produces:
  - `updateStatuses(ids, status): Promise<{ updated: string[]; failed: { id: string; code: "NOT_FOUND" | "SLOT_TAKEN" | "CONFLICT" }[] }>`
  - `updateNotes(id, notes): Promise<BookingDto>`
  - `deleteBookings(ids): Promise<void>`

- [ ] **Step 1: Write the failing tests**

`server/test/admin-mutations.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm --prefix server test -- admin-mutations`

Expected: FAIL, because the status, notes and delete routes return 404.

- [ ] **Step 3: Add the body schemas**

Append to `server/src/modules/admin/admin-bookings.schemas.ts`, and add these imports:

```ts
import { objectIdSchema } from "../../lib/object-id"
```

```ts
const idsSchema = z.array(objectIdSchema).min(1).max(500)

export const statusBodySchema = z.object({
  ids: idsSchema,
  status: z.enum(BOOKING_STATUSES, { error: "Choose a valid status" }),
})

export const notesBodySchema = z.object({
  notes: z.string().max(2000, { error: "Keep notes under 2000 characters" }),
})

export const idsBodySchema = z.object({ ids: idsSchema })
```

- [ ] **Step 4: Add the service functions**

Append to `server/src/modules/admin/admin-bookings.service.ts`, and add these imports:

```ts
import type { BookingStatus } from "@shared/booking-schema"

import { holdsSlot, releaseAnySlot, withSlot } from "../bookings/slots"
```

```ts
type FailureCode = "NOT_FOUND" | "SLOT_TAKEN" | "CONFLICT"
const FAILURE_CODES = new Set<string>(["NOT_FOUND", "SLOT_TAKEN", "CONFLICT"])

const changedConcurrently = () =>
  new AppError(409, "CONFLICT", "This booking was changed by someone else. Refresh and try again.")

async function updateOneStatus(id: string, status: BookingStatus) {
  const doc = await Booking.findById(id).lean()
  if (!doc) throw notFound()
  if (doc.status === status) return

  // Guarding on the old status makes each transition (and its slot change) happen once.
  const guard = { _id: doc._id, status: doc.status }
  const assertApplied = (res: { modifiedCount: number }) => {
    if (res.modifiedCount === 0) throw changedConcurrently()
  }
  const wasHolding = holdsSlot(doc.status)
  const willHold = holdsSlot(status)

  if (wasHolding && !willHold) {
    assertApplied(
      await Booking.updateOne(guard, { $set: { status }, $unset: { specialistSlotKey: 1 } })
    )
    if (doc.specialist === "any") await releaseAnySlot(doc)
  } else if (!wasHolding && willHold) {
    await withSlot(doc, async (slotFields) =>
      assertApplied(await Booking.updateOne(guard, { $set: { status, ...slotFields } }))
    )
  } else {
    assertApplied(await Booking.updateOne(guard, { $set: { status } }))
  }
}

/** Each booking is updated independently; failures are reported, never hidden. */
export async function updateStatuses(ids: string[], status: BookingStatus) {
  const result: { updated: string[]; failed: { id: string; code: FailureCode }[] } = {
    updated: [],
    failed: [],
  }
  for (const id of new Set(ids)) {
    try {
      await updateOneStatus(id, status)
      result.updated.push(id)
    } catch (err) {
      if (err instanceof AppError && FAILURE_CODES.has(err.code)) {
        result.failed.push({ id, code: err.code as FailureCode })
      } else {
        throw err
      }
    }
  }
  return result
}

export async function updateNotes(id: string, notes: string): Promise<BookingDto> {
  const doc = await Booking.findByIdAndUpdate(
    parseObjectId(id),
    { $set: { notes } },
    { new: true, runValidators: true }
  ).lean()
  if (!doc) throw notFound()
  return toBookingDto(doc)
}

/** Hard delete; unknown ids are ignored, like the dashboard mock. */
export async function deleteBookings(ids: string[]): Promise<void> {
  for (const id of new Set(ids)) {
    const doc = await Booking.findByIdAndDelete(id).lean()
    // A named booking's slot key is deleted with the document.
    if (doc && doc.specialist === "any" && holdsSlot(doc.status)) await releaseAnySlot(doc)
  }
}
```

- [ ] **Step 5: Add the routes**

Replace `server/src/modules/admin/admin-bookings.routes.ts` with:

```ts
import { Router } from "express"

import { parse } from "../../lib/validate"
import {
  filtersSchema,
  idsBodySchema,
  listQuerySchema,
  notesBodySchema,
  statusBodySchema,
} from "./admin-bookings.schemas"
import {
  deleteBookings,
  exportBookings,
  getBooking,
  listBookings,
  updateNotes,
  updateStatuses,
} from "./admin-bookings.service"

// Mounted behind requireRole("staff", "admin") in app.ts.
export const adminBookingsRouter = Router()

adminBookingsRouter.get("/", async (req, res) => {
  res.json(await listBookings(parse(listQuerySchema, req.query)))
})

adminBookingsRouter.get("/export", async (req, res) => {
  res.json(await exportBookings(parse(filtersSchema, req.query)))
})

adminBookingsRouter.patch("/status", async (req, res) => {
  const { ids, status } = parse(statusBodySchema, req.body)
  res.json(await updateStatuses(ids, status))
})

// POST, not DELETE: some proxies drop DELETE request bodies.
adminBookingsRouter.post("/delete", async (req, res) => {
  await deleteBookings(parse(idsBodySchema, req.body).ids)
  res.status(204).end()
})

adminBookingsRouter.get("/:id", async (req, res) => {
  res.json(await getBooking(req.params.id))
})

adminBookingsRouter.patch("/:id/notes", async (req, res) => {
  const { notes } = parse(notesBodySchema, req.body)
  res.json(await updateNotes(req.params.id, notes))
})
```

- [ ] **Step 6: Run tests and typecheck**

Run: `npm --prefix server test && npm --prefix server run typecheck`

Expected: all PASS, including the 10 tests in `admin-mutations.test.ts`; typecheck exits 0.

- [ ] **Step 7: Commit**

```bash
git add server/src/modules/admin server/test/admin-mutations.test.ts
git commit -m "feat(server): add staff status, notes and delete endpoints"
```

---

### Task 10: Dashboard stats

**Files:**
- Create: `server/src/modules/admin/stats.service.ts`
- Modify: `server/src/modules/admin/admin-bookings.routes.ts`
- Test: `server/test/stats.test.ts`

**Interfaces:**
- Consumes: `todayKey`, `addDaysKey`, `slotInstant`, `Booking`.
- Produces: `getStats(now?: Date, tz?: string): Promise<BookingStats>` where `BookingStats = { today; upcomingWeek; pending; completedThisMonth; perDay: { date; count }[] }`.

- [ ] **Step 1: Write the failing test**

`server/test/stats.test.ts`:

```ts
import request from "supertest"
import { describe, expect, it } from "vitest"

import { createApp } from "../src/app"
import { getStats } from "../src/modules/admin/stats.service"
import { useTestDb } from "./db"
import { insertBookings, rawBooking, signIn } from "./helpers"

useTestDb()
const app = createApp()

// 11:00 on Mar 15 2026 in New York (EDT, UTC-4).
const NOW = new Date("2026-03-15T15:00:00Z")
const NY = "America/New_York"
const CREATED_TODAY = new Date("2026-03-15T14:00:00Z")
// 22:00 on Mar 14 in New York, even though it's already Mar 15 in UTC.
const CREATED_LATE_14TH = new Date("2026-03-15T02:00:00Z")
// Before the 14-day window (which starts Mar 2).
const CREATED_LONG_AGO = new Date("2026-03-01T12:00:00Z")

describe("getStats", () => {
  it("matches the dashboard definitions in the clinic's zone", async () => {
    const at = (date: string, status: "pending" | "confirmed" | "completed" | "cancelled", createdAt = CREATED_TODAY) =>
      rawBooking({ date, status, createdAt, updatedAt: createdAt })

    await insertBookings([
      at("2026-03-15", "pending"), // today, pending
      at("2026-03-15", "cancelled"), // excluded from today
      at("2026-03-18", "confirmed"), // upcoming week
      at("2026-03-22", "pending"), // upcoming week (today + 7), pending
      at("2026-03-23", "pending"), // beyond the week, pending
      at("2026-03-10", "pending"), // past: not pending
      at("2026-03-02", "completed", CREATED_LATE_14TH), // completed this month
      at("2026-02-27", "completed", CREATED_LONG_AGO), // completed last month
    ])

    const stats = await getStats(NOW, NY)

    expect(stats).toMatchObject({ today: 1, upcomingWeek: 2, pending: 3, completedThisMonth: 1 })
    expect(stats.perDay).toHaveLength(14)
    expect(stats.perDay[0]).toEqual({ date: "2026-03-02", count: 0 })
    expect(stats.perDay[12]).toEqual({ date: "2026-03-14", count: 1 })
    expect(stats.perDay[13]).toEqual({ date: "2026-03-15", count: 6 })
    expect(stats.perDay.reduce((sum, d) => sum + d.count, 0)).toBe(7)
  })

  it("returns zeros on an empty database", async () => {
    const stats = await getStats(NOW, NY)
    expect(stats).toMatchObject({ today: 0, upcomingWeek: 0, pending: 0, completedThisMonth: 0 })
    expect(stats.perDay.every((d) => d.count === 0)).toBe(true)
  })
})

describe("GET /api/admin/bookings/stats", () => {
  it("is staff-only and returns the BookingStats shape", async () => {
    await (await signIn(app, "owner")).agent.get("/api/admin/bookings/stats").expect(403)

    const res = await (await signIn(app, "staff")).agent
      .get("/api/admin/bookings/stats")
      .expect(200)
    expect(Object.keys(res.body).sort()).toEqual(
      ["completedThisMonth", "pending", "perDay", "today", "upcomingWeek"]
    )
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm --prefix server test -- stats`

Expected: FAIL, "Cannot find module '../src/modules/admin/stats.service'".

- [ ] **Step 3: Implement `server/src/modules/admin/stats.service.ts`**

```ts
import { env } from "../../config/env"
import { addDaysKey, slotInstant, todayKey } from "../../lib/clinic-time"
import { Booking } from "../bookings/booking.model"

/** Matches the frontend's BookingStats (src/types/booking.ts). */
export type BookingStats = {
  today: number
  upcomingWeek: number
  pending: number
  completedThisMonth: number
  perDay: { date: string; count: number }[]
}

type CountRows = { n: number }[]
type Facets = {
  today: CountRows
  upcomingWeek: CountRows
  pending: CountRows
  completedThisMonth: CountRows
  perDay: { _id: string; count: number }[]
}

const PER_DAY_WINDOW = 14

export async function getStats(
  now: Date = new Date(),
  tz: string = env.CLINIC_TZ
): Promise<BookingStats> {
  const today = todayKey(now, tz)
  const weekEnd = addDaysKey(today, 7)
  const month = today.slice(0, 7)
  const firstDay = addDaysKey(today, -(PER_DAY_WINDOW - 1))
  const active = { status: { $ne: "cancelled" } }

  const [facets] = await Booking.aggregate<Facets>([
    {
      $facet: {
        today: [{ $match: { date: today, ...active } }, { $count: "n" }],
        upcomingWeek: [
          { $match: { date: { $gt: today, $lte: weekEnd }, ...active } },
          { $count: "n" },
        ],
        pending: [{ $match: { status: "pending", date: { $gte: today } } }, { $count: "n" }],
        completedThisMonth: [
          { $match: { status: "completed", date: { $gte: `${month}-01`, $lte: `${month}-31` } } },
          { $count: "n" },
        ],
        // Bucketed by the day each booking was *created*, in the clinic's zone.
        perDay: [
          { $match: { createdAt: { $gte: slotInstant(firstDay, "00:00", tz) } } },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: tz } },
              count: { $sum: 1 },
            },
          },
        ],
      },
    },
  ])

  const count = (rows: CountRows) => rows[0]?.n ?? 0
  const perDay = new Map(facets.perDay.map((row) => [row._id, row.count]))

  return {
    today: count(facets.today),
    upcomingWeek: count(facets.upcomingWeek),
    pending: count(facets.pending),
    completedThisMonth: count(facets.completedThisMonth),
    perDay: Array.from({ length: PER_DAY_WINDOW }, (_, i) => {
      const date = addDaysKey(firstDay, i)
      return { date, count: perDay.get(date) ?? 0 }
    }),
  }
}
```

- [ ] **Step 4: Add the route**

In `server/src/modules/admin/admin-bookings.routes.ts`, add the import:

```ts
import { getStats } from "./stats.service"
```

and add this route directly after the `/export` route, so it is before `/:id`:

```ts
adminBookingsRouter.get("/stats", async (_req, res) => {
  res.json(await getStats())
})
```

- [ ] **Step 5: Run tests and typecheck**

Run: `npm --prefix server test && npm --prefix server run typecheck`

Expected: all PASS, including the 3 tests in `stats.test.ts`; typecheck exits 0.

- [ ] **Step 6: Commit**

```bash
git add server/src/modules/admin/stats.service.ts server/src/modules/admin/admin-bookings.routes.ts server/test/stats.test.ts
git commit -m "feat(server): add dashboard stats endpoint"
```

---

### Task 11: Developer docs, request collection, final verification

**Files:**
- Create: `server/README.md`, `server/requests.http`

- [ ] **Step 1: Create `server/README.md`**

````markdown
# Petopia API

Express 5 + MongoDB backend for Petopia. The design is in
`docs/superpowers/specs/2026-10-14-petopia-backend-v1-design.md`.

## Setup

1. Install dependencies at the repo root **and** in `server/`. The server reuses the root's
   `zod` and `date-fns` so that `shared/booking-schema.ts` has a single copy:
   ```bash
   npm install
   npm --prefix server install
   ```
2. Copy `server/.env.example` to `server/.env`. Fill in the two JWT secrets, `CLINIC_TZ`,
   `MONGODB_URI` (local MongoDB or Atlas) and `ADMIN_PASSWORD`.
3. Create the first admin: `npm --prefix server run seed:admin`

## Run

```bash
npm --prefix server run dev   # API on http://localhost:4000
npm run dev                   # Vite on :5173, proxies /api to :4000
```

## Test & build

```bash
npm --prefix server test       # in-memory MongoDB (downloads a binary on first run)
npm --prefix server run typecheck
npm --prefix server run build && npm --prefix server start
```

`server/requests.http` walks through every endpoint. Use the VS Code REST Client
extension, which keeps cookies between requests.

## Endpoints

| Method & path | Who |
|---|---|
| `POST /api/auth/register` · `login` · `refresh` · `logout`, `GET /api/auth/session` | public / cookie |
| `POST /api/bookings`, `GET /api/bookings/availability` | public |
| `GET /api/bookings/mine`, `PATCH /api/bookings/:id/cancel` | signed in |
| `GET /api/admin/bookings` (`/export`, `/stats`, `/:id`) | staff, admin |
| `PATCH /api/admin/bookings/status`, `PATCH /:id/notes`, `POST /delete` | staff, admin |
| `GET /api/health` | public |

Errors always look like `{ "error": { "code", "message", "fields"? } }`.
````

- [ ] **Step 2: Create `server/requests.http`**

```http
@base = http://localhost:4000/api
# Pick a future day for the booking examples
@day = 2030-01-15

### Health
GET {{base}}/health

### Availability (public)
GET {{base}}/bookings/availability?date={{day}}&specialist=clara-vance

### Book as a guest
POST {{base}}/bookings
Content-Type: application/json

{ "petType": "dog", "service": "wellness", "specialist": "clara-vance", "date": "{{day}}",
  "time": "10:30", "fullName": "Jane Doe", "phone": "555-0192", "petInfo": "Rex, 4" }

### Same slot again → 409 SLOT_TAKEN
POST {{base}}/bookings
Content-Type: application/json

{ "petType": "cat", "service": "dental", "specialist": "clara-vance", "date": "{{day}}",
  "time": "10:30", "fullName": "Omar Ali", "phone": "555-0100", "petInfo": "Max, 2" }

### Register an owner (sets cookies)
POST {{base}}/auth/register
Content-Type: application/json

{ "name": "Pet Owner", "email": "owner@example.com", "password": "supersecret" }

### Book as the owner
# @name ownerBooking
POST {{base}}/bookings
Content-Type: application/json

{ "petType": "dog", "service": "vaccines", "specialist": "any", "date": "{{day}}",
  "time": "09:00", "fullName": "Pet Owner", "phone": "555-0111", "petInfo": "Bella, 1" }

### My bookings
GET {{base}}/bookings/mine

### Cancel my booking
PATCH {{base}}/bookings/{{ownerBooking.response.body.id}}/cancel

### Log out
POST {{base}}/auth/logout

### Log in as the seeded admin (ADMIN_EMAIL / ADMIN_PASSWORD from .env)
POST {{base}}/auth/login
Content-Type: application/json

{ "email": "admin@petopia.com", "password": "change-me", "remember": true }

### Current session
GET {{base}}/auth/session

### List with filters
# @name list
GET {{base}}/admin/bookings?status=pending,confirmed&sort=date-asc&page=1&pageSize=10

### One booking
GET {{base}}/admin/bookings/{{list.response.body.items[0].id}}

### Confirm it
PATCH {{base}}/admin/bookings/status
Content-Type: application/json

{ "ids": ["{{list.response.body.items[0].id}}"], "status": "confirmed" }

### Add notes
PATCH {{base}}/admin/bookings/{{list.response.body.items[0].id}}/notes
Content-Type: application/json

{ "notes": "Bring vaccination card" }

### Stats
GET {{base}}/admin/bookings/stats

### Export (CSV source)
GET {{base}}/admin/bookings/export?sort=date-asc

### Delete
POST {{base}}/admin/bookings/delete
Content-Type: application/json

{ "ids": ["{{list.response.body.items[0].id}}"] }
```

- [ ] **Step 3: Full verification**

Run each command and confirm the expected output before claiming completion:

```bash
npm --prefix server test            # Expected: all test files pass, 0 failures
npm --prefix server run typecheck   # Expected: exit 0, no output
npm --prefix server run build       # Expected: dist/server.js written
npm run build 2>&1 | tail -20       # Expected: no worse than the Task 1 baseline
git status --short                  # Expected: only the user's pre-existing WIP remains
```

- [ ] **Step 4: Commit**

```bash
git add server/README.md server/requests.http
git commit -m "docs(server): add setup guide and request collection"
```

---

## Next sub-project (not in this plan)

Frontend API client: `src/services/api/{http,auth-service,bookings-service}.ts`.
- Use `fetch` with `credentials: "include"`, refresh once on 401, and map `404 → null` for `get`.
- Use a `BroadcastChannel` for `subscribe`/`onChange`.
- Swap `src/services/index.ts`, wire `BookingSection.onBook`, and repoint `src/types/booking.ts` at `@shared`.
- Add a dashboard role check and owner register / "my bookings" pages.
