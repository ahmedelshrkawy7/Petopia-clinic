# Petopia Backend v1 — Design

Date: 2026-10-14
Status: Draft, awaiting review

## 1. Goal & scope

Build a Node.js + Express + MongoDB API for Petopia that is a **drop-in replacement for the frontend's mock services** (`src/services/auth/auth-service.ts`, `src/services/bookings/bookings-service.ts`, `src/types/booking.ts`). It must:

1. Authenticate **clinic staff/admins** (dashboard) and **pet owners** (email + password, httpOnly-cookie JWTs).
2. Accept bookings from the landing-page form, from guests and from logged-in owners.
3. Prevent double-booking of time slots.
4. Give staff everything the existing dashboard calls:
   - list / filter / sort / paginate, export-all, and get one
   - bulk status change, notes, bulk delete
   - stats
5. Let owners register, see their own bookings, and cancel them.

### Out of scope for v1

- **Frontend sub-project (next spec):** the real `AuthService` / `BookingsService` implementations in `src/services/api/*`, the swap in `src/services/index.ts`, wiring `BookingSection.onBook`, owner register/"my bookings" pages, and a dashboard role check.
- Rescheduling, email/SMS notifications, password reset, email verification, OAuth, staff-account management UI, server-push live updates.
- Pets as separate entities, reviews, services/specialists managed from a CMS.

v1 only touches the frontend in two ways: it moves the shared schema and adds the Vite dev proxy (section 10).

## 2. Architecture

```
Petopia/
  shared/
    booking-schema.ts        # moved from src/lib (+ BOOKING_STATUSES); used by frontend + server
  src/                       # existing Vite frontend
  server/
    package.json             # its own npm project
    tsconfig.json
    .env.example
    src/
      server.ts              # connect DB, listen
      app.ts                 # createApp() — exported for tests
      config/env.ts          # zod-validated env
      db/connect.ts
      lib/                   # AppError, jwt + cookie helpers, clinic-time helpers
      middleware/
        attach-user.ts       # optional: reads access cookie, sets req.user
        require-auth.ts      # 401 if no req.user
        require-role.ts      # 403 if role not allowed
        validate.ts          # zod body/query/params validation
        error-handler.ts
      modules/
        auth/      auth.routes.ts  auth.controller.ts  auth.service.ts  user.model.ts
        bookings/  bookings.routes.ts  bookings.controller.ts  bookings.service.ts
                   booking.model.ts  slot-counter.model.ts  slots.ts  availability.ts
                   booking.serializer.ts
        admin/     admin-bookings.routes.ts  admin-bookings.controller.ts
                   admin-bookings.service.ts  stats.service.ts
    scripts/seed-admin.ts
    scripts/seed-demo.ts     # optional demo bookings, mirrors src/services/bookings/seed.ts
    test/
```

- **Stack:** Node 20+, Express 5 (native async error propagation), TypeScript, Mongoose 8, zod 4, bcrypt, jsonwebtoken, cookie-parser, helmet, cors, express-rate-limit, `@date-fns/tz`.
- **Dev:** `tsx watch src/server.ts`. **Build:** `tsup` bundles `src/` plus `../shared` into `dist/`, which avoids `rootDir` problems with a folder outside `server/`.
- **Layering:** routes → validate → controller (HTTP only) → service (business rules, no `req`/`res`) → model.
- **Slot logic is one module.** `slots.ts` exposes `acquireSlot(booking)` and `releaseSlot(booking)`. It is used by create, cancel, status change and delete, so every path enforces the same double-booking rules.
- Each feature is a folder under `modules/`, so future work (pets, reviews) is added without touching existing modules.

## 3. Configuration (`server/.env`)

Validated at startup with zod. The process exits with a readable message if anything is invalid.

| Var | Default | Notes |
|---|---|---|
| `PORT` | 4000 | |
| `MONGODB_URI` | — | required; local or Atlas |
| `JWT_ACCESS_SECRET` | — | required, ≥ 32 chars |
| `JWT_REFRESH_SECRET` | — | required, ≥ 32 chars, different from access |
| `CLIENT_ORIGIN` | `http://localhost:5173` | CORS allow-origin for non-proxied deployments |
| `ANY_SLOT_CAPACITY` | 2 | max active "any available" bookings per date+time |
| `CLINIC_TZ` | — | required IANA zone (e.g. `America/New_York`); defines "today", past slots, stats buckets |
| `NODE_ENV` | `development` | `production` ⇒ `Secure` cookies, no stack traces |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | — | only for `npm run seed:admin` |

## 4. Shared schema (`shared/booking-schema.ts`)

- Move the existing file unchanged in behaviour. Exports: `PET_TYPES`, `SERVICES`, `SPECIALISTS`, `TIME_SLOTS`, `isSlotInPast`, `bookingSchema`, form types.
- `startOfToday()` moves inside the validator, so it's evaluated per call and not once at import time.
- Move `BOOKING_STATUSES` here from `src/types/booking.ts`, which then re-imports it. The server and the dashboard use the same list.
- Add **`bookingRequestSchema`**, the JSON wire format:
  - same fields as the form, except `date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)` (a clinic-local calendar day).
  - The frontend API client sends `format(values.date, "yyyy-MM-dd")`.
- `src/lib/booking-schema.ts` becomes a one-line `export * from "@shared/booking-schema"`, so none of the existing imports need to change.
- The server checks "not in the past" itself, using `CLINIC_TZ`. It doesn't trust the client clock.

## 5. Data model

### `users`

| Field | Type | Notes |
|---|---|---|
| `email` | string | unique index, lowercased, trimmed |
| `passwordHash` | string | bcrypt cost 12; `select: false`, never serialized |
| `name` | string | 2–80 chars |
| `phone` | string? | used to prefill the booking form |
| `role` | `"owner" \| "staff" \| "admin"` | default `"owner"` |
| `refreshTokenVersion` | number | default 0; incremented on logout ⇒ revokes all refresh tokens |
| timestamps | | |

### `bookings`

| Field | Type | Notes |
|---|---|---|
| `petType` | enum `PET_TYPES` | |
| `service` | enum of `SERVICES` values | |
| `specialist` | enum of `SPECIALISTS` values | `"any"` or a doctor id |
| `date` | string `YYYY-MM-DD` | clinic-local day |
| `time` | enum `TIME_SLOTS` | `"HH:mm"` |
| `fullName`, `phone`, `petInfo` | string | from the form |
| `phoneDigits` | string | `phone` with non-digits stripped; used by search |
| `status` | enum `BOOKING_STATUSES` | `pending \| confirmed \| completed \| cancelled`, default `pending` |
| `notes` | string | staff-only, default `""`, max 2000 chars |
| `userId` | ObjectId? → users | set when booked while logged in |
| `specialistSlotKey` | string? | `"<date>\|<time>\|<specialist>"`; set only while the slot is held **and** specialist ≠ `"any"` |
| timestamps | | `createdAt`, `updatedAt` |

Indexes:
- `{ specialistSlotKey: 1 }` **unique, partial** (`specialistSlotKey: { $exists: true }`). This is the double-booking guard for named specialists.
- `{ date: 1, time: 1 }` for list / availability / stats.
- `{ createdAt: -1 }` for the "recent" view and per-day stats.
- `{ userId: 1, date: -1 }` for "my bookings".

### `slotcounters`

| Field | Notes |
|---|---|
| `date`, `time` | unique compound index |
| `anyCount` | number of slot-holding `"any"` bookings in that slot |

### API representation

Every booking response is serialized to exactly the frontend `Booking` type:
- `id` (string)
- `createdAt`, `updatedAt` (ISO strings)
- `status`, `notes`
- `petType`, `service`, `specialist`, `date`, `time`
- `fullName`, `phone`, `petInfo`

Internal fields (`_id`, `__v`, `userId`, `specialistSlotKey`, `phoneDigits`) are never sent. Owner endpoints send the same shape **without `notes`**.

## 6. Slot rules

A booking **holds its slot** when `status ≠ "cancelled"`. Completed bookings keep holding it; they're in the past, so it doesn't matter.

**`acquireSlot`:**
- Named specialist: set `specialistSlotKey`. A duplicate-key error (11000) ⇒ `409 SLOT_TAKEN`.
- `"any"`: `findOneAndUpdate({date, time, anyCount: {$lt: CAP}}, {$inc: {anyCount: 1}}, {upsert: true})`.
  - If the slot is full, the upsert collides with the unique `{date, time}` index ⇒ catch 11000 ⇒ `409 SLOT_TAKEN`.
  - If the booking write that follows fails, `$inc: -1` to release the slot, then rethrow.

**`releaseSlot`:** `$unset specialistSlotKey`, or `$inc anyCount: -1` (never below 0).

**When each runs:**

| Event | Slot action |
|---|---|
| create | acquire (also rejects past slots: `400 SLOT_IN_PAST`) |
| status → `cancelled` (owner cancel or staff) | release |
| status `cancelled` → anything else (staff re-activates) | acquire; may fail with `SLOT_TAKEN` |
| other status changes | none |
| delete | release if held |

Intentional simplification: "any" capacity and named-specialist bookings are counted **independently**. A shared doctor pool can be modelled later.

**Availability (`GET /api/bookings/availability?date=YYYY-MM-DD&specialist=<value>`):**
- Returns `{ date, slots: [{ time, available }] }` for every `TIME_SLOTS` entry.
- A slot is unavailable if it's in the past (clinic time), or full (named: a holding booking exists; any: `anyCount >= CAP`).

## 7. Auth

### Tokens

- **Access token:** JWT HS256, 15 min, claims `{ sub, role }`, cookie `access_token`, `Path=/`.
- **Refresh token:** JWT, claims `{ sub, ver, remember }`, cookie `refresh_token`, `Path=/api/auth`.
  - Absolute session lifetime: **7 days** if `remember`, **12 hours** otherwise.
  - Non-remember cookies have no `Max-Age`, so they're browser-session cookies.
  - Refresh **rotates** the token but keeps the original `exp`. A session can't be extended forever, and `expiresAt` stays stable for the frontend's auto-logout timer.
- All cookies are `HttpOnly; SameSite=Lax`, plus `Secure` in production.
- CSRF stance for v1: `SameSite=Lax` + JSON-only bodies (`express.json` rejects other content types for mutations) + the same-origin dev proxy. If the API is ever hosted on a different site from the frontend, add a CSRF token.

### Session shape (matches the frontend `AuthSession`)

`{ user: { id, email, name, role }, expiresAt }`. `expiresAt` is epoch ms of the refresh token's `exp`. `role` is extra, so the dashboard can reject owners.

### Endpoints

| Method & path | Auth | Behaviour |
|---|---|---|
| `POST /api/auth/register` | public, rate-limited | `{name, email, password (8–128), phone?}` → creates an `owner`, sets cookies (remember = true), `201 session`. Duplicate email ⇒ `409 EMAIL_TAKEN`. |
| `POST /api/auth/login` | public, rate-limited | `{email, password, remember}` → sets cookies, `200 session`. Unknown email and wrong password give the same `401 INVALID_CREDENTIALS` ("Incorrect email or password", the mock's message). A dummy bcrypt compare on unknown email keeps the timing similar. |
| `POST /api/auth/refresh` | refresh cookie | Verifies the token and that `ver` matches the user → new cookies, `200 session`. Otherwise `401` + clears cookies. |
| `GET /api/auth/session` | refresh cookie | `200 session` if the refresh cookie is valid, else `401`. Backs `getSession()`. |
| `POST /api/auth/logout` | any | Bumps `refreshTokenVersion` if a valid refresh cookie is present, clears cookies, `204`. |

Rate limit: 10 requests / 15 min per IP on register + login.

### Middleware

- `attachUser` runs globally. It verifies the access cookie if present and sets `req.user = { id, role }`. An invalid or expired cookie is ignored; the client calls `/refresh` after a `401` and retries once.
- `requireAuth`: `401 UNAUTHENTICATED`.
- `requireRole("staff", "admin")`: `403 FORBIDDEN`.

### Staff accounts

There's no public route to become staff. `npm run seed:admin` creates or updates an admin from env vars.

## 8. Endpoints

### Public / owner

| Method & path | Auth | Behaviour |
|---|---|---|
| `POST /api/bookings` | optional | Body `bookingRequestSchema`; attaches `userId` if logged in; slot rules; `201 Booking`. |
| `GET /api/bookings/availability` | public | Section 6. |
| `GET /api/bookings/mine` | logged in | Own bookings, `date-desc`, owner shape. |
| `PATCH /api/bookings/:id/cancel` | logged in | Only the owner's own booking (else `404`). Allowed only from `pending`/`confirmed` and before the slot time, else `409 NOT_CANCELLABLE`. Releases the slot. |

### Staff (`requireRole("staff","admin")`), mapping 1:1 to `BookingsService`

| Method & path | Service method | Behaviour |
|---|---|---|
| `GET /api/admin/bookings` | `list` | Query below → `{ items, total, page, pageSize }` |
| `GET /api/admin/bookings/export` | `listAll` | Same filters + sort, no pagination, capped at 5000 rows (`400 EXPORT_TOO_LARGE` above that) → `Booking[]` |
| `GET /api/admin/bookings/stats` | `stats` | `BookingStats`, section 9 |
| `GET /api/admin/bookings/:id` | `get` | `Booking`, or `404` (the client maps it to `null`) |
| `PATCH /api/admin/bookings/status` | `updateStatus` | `{ ids: string[1..500], status }`, section 8.1 |
| `PATCH /api/admin/bookings/:id/notes` | `updateNotes` | `{ notes }` → updated `Booking` |
| `POST /api/admin/bookings/delete` | `remove` | `{ ids: string[1..500] }` → hard delete, releasing slots, `204`. POST is used because some proxies strip `DELETE` bodies. |

**List query** (zod-validated; arrays may be repeated params or comma-separated):

| Param | Behaviour |
|---|---|
| `search` | Case-insensitive substring on `fullName`/`petInfo` (regex-escaped). **Or**, if it contains digits, a substring match of those digits against `phoneDigits`. Same rule as the mock. |
| `status[]`, `service[]`, `petType[]` | Match any of the given values. |
| `from`, `to` | `YYYY-MM-DD`, inclusive. |
| `sort` | `date-asc \| date-desc \| created-asc \| created-desc`, default `date-desc`. Date sorts use `date, time`. Ties break on `_id`. |
| `page` | default 1. |
| `pageSize` | default 10, max 100. |

### 8.1 Bulk status change

- Each id is processed independently and the slot rules run per booking.
- Response: `200 { updated: string[], failed: [{ id, code: "NOT_FOUND" | "SLOT_TAKEN" }] }`.
- The frontend API client resolves when `failed` is empty. Otherwise it throws an error naming how many failed (e.g. "2 bookings couldn't be re-activated: slot already taken").
- No cross-document transaction is needed: a partial result is reported, never hidden.

### Misc

- `GET /api/health` → `{ ok: true, db: "connected" | "disconnected" }`.
- Unknown `/api/*` ⇒ `404 NOT_FOUND`.

## 9. Stats (`GET /api/admin/bookings/stats`)

Same definitions as the mock. "Today" and day buckets use `CLINIC_TZ`.

| Field | Definition |
|---|---|
| `today` | non-cancelled bookings with `date == today` |
| `upcomingWeek` | non-cancelled bookings with `today < date ≤ today+7` |
| `pending` | `status == pending` and `date ≥ today` |
| `completedThisMonth` | `status == completed` and `date` in the current month |
| `perDay` | the last 14 days (oldest first, zero-filled): count of bookings **created** that day, bucketed by `$dateToString` with `timezone: CLINIC_TZ` |

All five run in one aggregation (`$facet`).

## 10. Frontend touch points in v1

- Move the schema to `shared/`, leave the re-export stub in `src/lib/`, and add an `@shared/*` alias in `vite.config.ts` + `tsconfig.app.json` (section 4).
- `vite.config.ts`: `server.proxy["/api"] = "http://localhost:4000"`.
- Root `package.json`: script `dev:server` → `npm --prefix server run dev`.
- **The mocks stay active.** Swapping `src/services/index.ts` to the real API is the next sub-project.

## 11. Error handling

- One response shape everywhere: `{ "error": { "code": "SLOT_TAKEN", "message": "...", "fields"?: { "time": "..." } } }`.
- `AppError(status, code, message, fields?)` is thrown from services. Express 5 forwards async throws to `errorHandler`.
- `errorHandler` mapping:
  - `ZodError` ⇒ `400 VALIDATION_ERROR`, with `fields` keyed by the form field names so the client can call `form.setError`.
  - Invalid ObjectId / `CastError` ⇒ `404 NOT_FOUND`.
  - Unhandled 11000 ⇒ `409 CONFLICT`.
  - Anything else ⇒ `500 INTERNAL_ERROR`, logged with the stack, generic message to the client.
- Security middleware: `helmet()`, `express.json({ limit: "10kb" })`, `cors({ origin: CLIENT_ORIGIN, credentials: true })`, `app.set("trust proxy", 1)` (for rate-limit IPs behind a proxy).

## 12. Testing

Vitest + Supertest against `createApp()`, using `mongodb-memory-server` (one instance per file, collections cleared between tests). `vi.setSystemTime` for time-dependent cases; `CLINIC_TZ` set explicitly in tests.

Required coverage:
- **Config:** a missing or short secret, or a missing `CLINIC_TZ`, fails with a readable error.
- **Auth:**
  - register → `session` + cookies; duplicate email 409
  - login with an unknown email vs a wrong password ⇒ identical 401 body
  - `remember` false ⇒ 12h `expiresAt` and no `Max-Age`; `remember` true ⇒ 7d
  - refresh rotates but keeps `expiresAt`
  - logout makes the old refresh token fail
  - `/session` 401 without a cookie
  - `passwordHash` never appears in any response
- **Bookings:**
  - guest create 201 with no `userId` stored; logged-in create stores `userId`
  - response matches the `Booking` shape exactly
  - validation `fields`; past slot 400
  - named specialist duplicate 409, including **two concurrent requests ⇒ exactly one 201**
  - "any": CAP succeed, CAP+1 ⇒ 409, including the concurrent case
  - owner cancel frees the slot (rebook succeeds); someone else's id ⇒ 404; past ⇒ 409
  - availability reflects all of the above
- **Admin:**
  - anonymous 401, owner 403, staff/admin 200
  - every filter, each sort, pagination totals, search by name and by phone digits
  - export cap
  - bulk status: cancel releases slots; re-activate into a taken slot ⇒ listed in `failed`; unknown id ⇒ `NOT_FOUND`
  - notes update returns the updated booking and bumps `updatedAt`
  - bulk delete releases slots
  - stats: each field against a fixed dataset at a fixed "now", including the timezone boundary for `perDay`

## 13. Success criteria

- `npm --prefix server test` passes and `npm --prefix server run build` succeeds.
- `npm run typecheck` and `npm run build` (frontend) still pass after the schema move. The dashboard still works on its mocks.
- With MongoDB running, `npm run dev:server` + an `.http` request file (`server/requests.http`, committed) demonstrates the whole flow:
  - seed admin, register an owner, book as guest and as owner
  - get a 409 on a double booking, see the booking in `/mine`, cancel it
  - as admin: list with filters, change status, add notes, read stats, delete
