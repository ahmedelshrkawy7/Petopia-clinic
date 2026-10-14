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
