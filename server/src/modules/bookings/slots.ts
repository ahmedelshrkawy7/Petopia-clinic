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
