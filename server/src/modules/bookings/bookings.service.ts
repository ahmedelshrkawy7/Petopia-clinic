import {
  TIME_SLOTS,
  type BookingRequest,
  type SpecialistValue,
  type TimeSlot,
} from "@shared/booking-schema"

import { env } from "../../config/env"
import { AppError, notFound } from "../../lib/app-error"
import { isPastSlot } from "../../lib/clinic-time"
import { parseObjectId } from "../../lib/object-id"
import { Booking, type BookingRecord } from "./booking.model"
import { SlotCounter } from "./slot-counter.model"
import { releaseAnySlot, withSlot } from "./slots"

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
