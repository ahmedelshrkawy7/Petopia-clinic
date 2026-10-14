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
