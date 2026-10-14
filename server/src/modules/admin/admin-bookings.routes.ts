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
import { getStats } from "./stats.service"

// Mounted behind requireRole("staff", "admin") in app.ts.
export const adminBookingsRouter = Router()

adminBookingsRouter.get("/", async (req, res) => {
  res.json(await listBookings(parse(listQuerySchema, req.query)))
})

adminBookingsRouter.get("/export", async (req, res) => {
  res.json(await exportBookings(parse(filtersSchema, req.query)))
})

adminBookingsRouter.get("/stats", async (_req, res) => {
  res.json(await getStats())
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
