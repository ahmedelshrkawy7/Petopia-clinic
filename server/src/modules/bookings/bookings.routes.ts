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
