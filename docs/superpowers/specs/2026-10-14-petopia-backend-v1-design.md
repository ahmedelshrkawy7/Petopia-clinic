# Petopia Backend v1 — Design

Date: 2026-10-14
Status: Draft, awaiting review

## 1. Goal & scope

Build a Node.js + Express + MongoDB API for Petopia that:

1. Authenticates **pet owners** and **clinic staff/admins** (email + password).
2. Accepts bookings from the existing landing-page form (guests and logged-in owners).
3. Prevents double-booking of time slots.
4. Lets staff **list and filter** all bookings (data source for a future dashboard).
5. Lets owners see and cancel their own bookings.

### Out of scope for v1 (later sub-projects)

- **Frontend sub-project (next spec):** API client, wiring `BookingSection.onBook`, login/register pages, react-router, owner "my bookings" page, staff dashboard table.
- Staff status changes (confirm / complete / no-show), rescheduling, stats.
- Email/SMS notifications, password reset, email verification, OAuth.
- Pets as separate entities, reviews, services/specialists managed from a CMS.

v1 only touches the frontend in two ways: it moves the shared schema and adds the Vite dev proxy (section 9).

## 2. Architecture

```
Petopia/
  shared/
    booking-schema.ts        # moved from src/lib; used by frontend + server
  src/                       # existing Vite frontend (unchanged except imports)
  server/
    package.json             # its own npm project
    tsconfig.json
    .env.example
    src/
      server.ts              # connect DB, listen
      app.ts                 # build express app (exported for tests)
      config/env.ts          # zod-validated env
      db/connect.ts
      lib/                   # AppError, jwt helpers, clinic-time helpers
      middleware/
        attach-user.ts       # optional: reads access cookie, sets req.user
        require-auth.ts      # 401 if no req.user
        require-role.ts      # 403 if role not allowed
        validate.ts          # zod body/query validation
        error-handler.ts
      modules/
        auth/      auth.routes.ts  auth.controller.ts  auth.service.ts  user.model.ts
        bookings/  bookings.routes.ts  bookings.controller.ts  bookings.service.ts
                   booking.model.ts  slot-counter.model.ts  availability.ts
        admin/     admin.routes.ts  (staff booking listing)
    scripts/seed-admin.ts
    test/
```

- **Stack:** Node 20+, Express 5 (native async error propagation), TypeScript, Mongoose 8, zod 4, bcrypt, jsonwebtoken, cookie-parser, helmet, express-rate-limit, `@date-fns/tz`.
- **Dev:** `tsx watch src/server.ts`. **Build:** `tsup` bundles `src/` plus `../shared` into `dist/`, which avoids `rootDir` problems with a folder outside `server/`.
- **Layering:** routes → validate → controller (HTTP only) → service (business rules, no `req`/`res`) → model. Services are what the tests exercise most.
- Each module is self-contained, so future features (pets, reviews) are added as new folders under `modules/`.

## 3. Configuration (`server/.env`)

Validated at startup with zod. The process exits with a clear message if anything is invalid.

| Var | Default | Notes |
|---|---|---|
| `PORT` | 4000 | |
| `MONGODB_URI` | — | required; local or Atlas |
| `JWT_ACCESS_SECRET` | — | required, ≥ 32 chars |
| `JWT_REFRESH_SECRET` | — | required, ≥ 32 chars, different from access |
| `CLIENT_ORIGIN` | `http://localhost:5173` | CORS allow-origin for non-proxied deployments |
| `ANY_SLOT_CAPACITY` | 2 | max "any available" bookings per date+time |
| `CLINIC_TZ` | — | required IANA zone (e.g. `America/New_York`); used for "today" / past-slot checks |
| `NODE_ENV` | `development` | `production` ⇒ `Secure` cookies |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | — | only for `npm run seed:admin` |

## 4. Shared schema (`shared/booking-schema.ts`)

- Keeps the existing exports (`PET_TYPES`, `SERVICES`, `SPECIALISTS`, `TIME_SLOTS`, `bookingSchema`, form types) so the form keeps working.
- `startOfToday()` moves inside the validator, so it's evaluated per call and not once at import time.
- Adds **`bookingRequestSchema`**, the JSON wire format:
  - same fields as the form, except `date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)` (a clinic-local calendar day).
  - The frontend sends `format(values.date, "yyyy-MM-dd")`.
- The server checks "not in the past" itself using `CLINIC_TZ` (section 6). It doesn't trust the client clock.

## 5. Data model

### `users`

| Field | Type | Notes |
|---|---|---|
| `email` | string | unique index, lowercased, trimmed |
| `passwordHash` | string | bcrypt cost 12; never serialized (`select: false` + `toJSON` transform) |
| `name` | string | 2–80 chars |
| `phone` | string? | used to prefill the booking form |
| `role` | `"owner" \| "staff" \| "admin"` | default `"owner"` |
| `refreshTokenVersion` | number | default 0; incremented on logout ⇒ revokes all refresh tokens |
| `createdAt/updatedAt` | Date | timestamps |

### `bookings`

| Field | Type | Notes |
|---|---|---|
| `petType` | enum `PET_TYPES` | |
| `service` | enum of `SERVICES` values | |
| `specialist` | enum of `SPECIALISTS` values | `"any"` or a doctor id |
| `date` | string `YYYY-MM-DD` | clinic-local day |
| `time` | enum `TIME_SLOTS` | `"HH:mm"` |
| `fullName`, `phone`, `petInfo` | string | from the form |
| `userId` | ObjectId? → users | set when booked while logged in |
| `status` | `"pending" \| "cancelled"` | v1 values; more added with staff actions later |
| `specialistSlotKey` | string? | `"<date>\|<time>\|<specialist>"`, set only while active **and** specialist ≠ `"any"` |
| timestamps | | |

Indexes:
- `{ specialistSlotKey: 1 }` **unique, partial** (`specialistSlotKey: { $exists: true }`). This is the double-booking guard for named specialists.
- `{ date: 1, time: 1 }` for listing/availability.
- `{ userId: 1, date: -1 }` for "my bookings".

### `slotcounters`

| Field | Notes |
|---|---|
| `date`, `time` | unique compound index |
| `anyCount` | number of active `"any"` bookings in that slot |

## 6. Booking rules

**Create (`POST /api/bookings`):**
1. Validate the body with `bookingRequestSchema`.
2. Reject (`400 SLOT_IN_PAST`) if `date + time` in `CLINIC_TZ` is ≤ now.
3. If `req.user` is set, attach `userId`. Guests stay anonymous.
4. Named specialist: insert with `specialistSlotKey`. A duplicate-key error (11000) ⇒ `409 SLOT_TAKEN`.
5. `"any"`: `findOneAndUpdate({date, time, anyCount: {$lt: CAP}}, {$inc: {anyCount: 1}}, {upsert: true})`.
   - No match because the slot is full ⇒ the upsert hits the unique index ⇒ catch 11000 ⇒ `409 SLOT_TAKEN`.
   - Then insert the booking. If that insert fails, `$inc: -1` to release the slot and rethrow.
6. Return `201` with the booking.

Simplification (documented, intentional): "any" capacity and named-specialist bookings are counted **independently**. Modelling one shared doctor pool is left for when the clinic has more specialists.

**Cancel (`PATCH /api/bookings/:id/cancel`, owner):** only the owning user, only if `status === "pending"` and the slot is still in the future. Sets `status = "cancelled"`, `$unset specialistSlotKey` (frees a named slot) or decrements `anyCount` (frees an "any" slot). Otherwise `404` (not yours / doesn't exist; no information leak) or `409 NOT_CANCELLABLE`.

**Availability (`GET /api/bookings/availability?date=YYYY-MM-DD&specialist=<value>`):**
- Returns `{ date, slots: [{ time: "09:00", available: true }, ...] }` for every `TIME_SLOTS` entry.
- A slot is unavailable if it's in the past, or taken (named: an active booking exists; any: `anyCount >= CAP`).

## 7. Auth

**Tokens (JWT, HS256):**
- Access token: 15 min, claims `{ sub, role }`, cookie `access_token`, `Path=/`.
- Refresh token: 7 days, claims `{ sub, ver }` (ver = `refreshTokenVersion`), cookie `refresh_token`, `Path=/api/auth`.
- Both cookies are `HttpOnly; SameSite=Lax`, plus `Secure` in production.
- `SameSite=Lax` + JSON-only bodies + the same-origin proxy is the CSRF stance for v1. If the API ever moves to a different site, revisit this (add a CSRF token).

**Endpoints:**

| Method & path | Auth | Behaviour |
|---|---|---|
| `POST /api/auth/register` | public, rate-limited | `{name, email, password (≥ 8), phone?}` → creates role `owner`, sets cookies, `201 {user}`. Duplicate email ⇒ `409 EMAIL_TAKEN`. |
| `POST /api/auth/login` | public, rate-limited | `{email, password}` → sets cookies, `{user}`. Wrong email *or* password ⇒ same `401 INVALID_CREDENTIALS`. |
| `POST /api/auth/refresh` | refresh cookie | Verifies the token and that `ver` matches the user → issues new access + refresh cookies. Otherwise `401` + clears cookies. |
| `POST /api/auth/logout` | any | Increments `refreshTokenVersion` if logged in, clears cookies, `204`. |
| `GET /api/auth/me` | required | `{user}` (id, email, name, phone, role). |

Rate limit: 10 requests / 15 min per IP on register + login.

**Middleware:**
- `attachUser` runs globally. It verifies the access cookie if present and sets `req.user = {id, role}`. An invalid or expired cookie is simply ignored (the client calls `/refresh`).
- `requireAuth`: `401 UNAUTHENTICATED` when there's no `req.user`.
- `requireRole("staff","admin")`: `403 FORBIDDEN`.

**Staff accounts:** there's no public route to become staff. `npm run seed:admin` creates or updates an admin from env. Creating more staff is a later admin feature.

## 8. Remaining endpoints

| Method & path | Auth | Behaviour |
|---|---|---|
| `POST /api/bookings` | optional | section 6 |
| `GET /api/bookings/availability` | public | section 6 |
| `GET /api/bookings/mine` | owner (any logged-in user) | own bookings, newest date first |
| `PATCH /api/bookings/:id/cancel` | logged in | section 6 |
| `GET /api/admin/bookings` | staff, admin | filters below |
| `GET /api/health` | public | `{ok: true}` + DB state |

`GET /api/admin/bookings` query, all optional and zod-validated:
- `from`, `to` (`YYYY-MM-DD`, inclusive)
- `status`, `service`, `specialist`, `petType`
- `q` (case-insensitive match on fullName / phone / petInfo)
- `page` (default 1), `limit` (default 20, max 100)
- Sorted by `date, time` ascending.
- Response: `{ items, page, limit, total }`.

## 9. Frontend touch points in v1

- Move `src/lib/booking-schema.ts` → `shared/booking-schema.ts`. Add an `@shared/*` alias in `vite.config.ts` + `tsconfig.app.json`, and update the import in `booking-section.tsx`.
- `vite.config.ts`: `server.proxy["/api"] = "http://localhost:4000"`.
- Root `package.json`: script `dev:server` → `npm --prefix server run dev`.

## 10. Error handling

- One response shape everywhere: `{ "error": { "code": "SLOT_TAKEN", "message": "...", "fields"?: { "time": "..." } } }`.
- `AppError(status, code, message, fields?)` is thrown from services. Express 5 forwards async throws to `errorHandler`.
- `errorHandler` mapping:
  - `ZodError` ⇒ `400 VALIDATION_ERROR` with `fields` keyed by path, matching the form field names so the frontend can call `form.setError`.
  - Mongoose `CastError` (bad id) ⇒ `404`.
  - Unhandled 11000 ⇒ `409 CONFLICT`.
  - Anything else ⇒ `500 INTERNAL_ERROR`, logged with stack, generic message to the client (no stack in production).
- Unknown route under `/api` ⇒ `404 NOT_FOUND`.
- Security middleware: `helmet()`, `express.json({ limit: "10kb" })`, `cors({ origin: CLIENT_ORIGIN, credentials: true })`.

## 11. Testing

Vitest + Supertest against `createApp()`, using `mongodb-memory-server` (fresh DB per test file, collections cleared between tests). Time-dependent tests use `vi.setSystemTime`.

Required coverage:
- **Auth:** register → cookies set and `/me` works; duplicate email 409; bad login 401 with an identical message for unknown email vs wrong password; refresh rotates tokens; logout invalidates the old refresh token; `passwordHash` never appears in any response.
- **Bookings:**
  - guest create 201 with no `userId`; logged-in create attaches `userId`
  - validation errors return `fields`; past slot 400
  - named specialist second booking 409, including **two concurrent requests ⇒ exactly one 201**
  - "any" capacity: CAP succeed, CAP+1 ⇒ 409, including the concurrent case
  - cancel frees the slot (rebooking succeeds); cancelling someone else's booking ⇒ 404
  - availability reflects all of the above
- **Admin:** owner ⇒ 403, anonymous ⇒ 401; staff sees all; each filter + pagination works.
- **Config:** missing secret ⇒ startup fails with a readable error.

## 12. Success criteria

- `npm --prefix server test` passes; `npm --prefix server run build` succeeds; `npm run typecheck` (frontend) still passes after the schema move.
- With `npm run dev` + `npm run dev:server` and a local MongoDB, a `curl` / REST-client script can: register, log in, book, see the booking in `/mine`, get a 409 on a double booking, and list it as the seeded admin via `/api/admin/bookings`.
