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
