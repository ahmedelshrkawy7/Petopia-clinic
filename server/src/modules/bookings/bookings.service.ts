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
