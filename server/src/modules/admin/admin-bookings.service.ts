import type { BookingStatus } from "@shared/booking-schema"
import type { FilterQuery } from "mongoose"

import { AppError, notFound } from "../../lib/app-error"
import { parseObjectId } from "../../lib/object-id"
import { Booking, type BookingRecord } from "../bookings/booking.model"
import { toBookingDto, type BookingDto } from "../bookings/booking.serializer"
import { holdsSlot, releaseAnySlot, withSlot } from "../bookings/slots"
import type { BookingSort, Filters, ListQuery } from "./admin-bookings.schemas"

export const EXPORT_LIMIT = 5000

const SORTS: Record<BookingSort, Record<string, 1 | -1>> = {
  "date-asc": { date: 1, time: 1, _id: 1 },
  "date-desc": { date: -1, time: -1, _id: -1 },
  "created-asc": { createdAt: 1, _id: 1 },
  "created-desc": { createdAt: -1, _id: -1 },
}

const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

/** Same semantics as the dashboard's mock (src/services/bookings/mock-bookings-service.ts). */
function buildFilter(q: Filters): FilterQuery<BookingRecord> {
  const filter: FilterQuery<BookingRecord> = {}
  if (q.status?.length) filter.status = { $in: q.status }
  if (q.service?.length) filter.service = { $in: q.service }
  if (q.petType?.length) filter.petType = { $in: q.petType }
  if (q.from || q.to) {
    filter.date = { ...(q.from ? { $gte: q.from } : {}), ...(q.to ? { $lte: q.to } : {}) }
  }
  const search = q.search?.trim()
  if (search) {
    const text = { $regex: escapeRegex(search), $options: "i" }
    const digits = search.replace(/\D/g, "")
    filter.$or = [
      { fullName: text },
      { petInfo: text },
      ...(digits ? [{ phoneDigits: { $regex: digits } }] : []),
    ]
  }
  return filter
}

export async function listBookings(q: ListQuery) {
  const filter = buildFilter(q)
  const [items, total] = await Promise.all([
    Booking.find(filter)
      .sort(SORTS[q.sort])
      .skip((q.page - 1) * q.pageSize)
      .limit(q.pageSize)
      .lean(),
    Booking.countDocuments(filter),
  ])
  return { items: items.map(toBookingDto), total, page: q.page, pageSize: q.pageSize }
}

export async function exportBookings(q: Filters, limit = EXPORT_LIMIT): Promise<BookingDto[]> {
  const filter = buildFilter(q)
  if ((await Booking.countDocuments(filter)) > limit) {
    throw new AppError(
      400,
      "EXPORT_TOO_LARGE",
      `Export is limited to ${limit} bookings. Narrow the filters and try again.`
    )
  }
  const items = await Booking.find(filter).sort(SORTS[q.sort]).lean()
  return items.map(toBookingDto)
}

export async function getBooking(id: string): Promise<BookingDto> {
  const doc = await Booking.findById(parseObjectId(id)).lean()
  if (!doc) throw notFound()
  return toBookingDto(doc)
}

type FailureCode = "NOT_FOUND" | "SLOT_TAKEN" | "CONFLICT"
const FAILURE_CODES = new Set<string>(["NOT_FOUND", "SLOT_TAKEN", "CONFLICT"])

const changedConcurrently = () =>
  new AppError(409, "CONFLICT", "This booking was changed by someone else. Refresh and try again.")

async function updateOneStatus(id: string, status: BookingStatus) {
  const doc = await Booking.findById(id).lean()
  if (!doc) throw notFound()
  if (doc.status === status) return

  // Guarding on the old status makes each transition (and its slot change) happen once.
  const guard = { _id: doc._id, status: doc.status }
  const assertApplied = (res: { modifiedCount: number }) => {
    if (res.modifiedCount === 0) throw changedConcurrently()
  }
  const wasHolding = holdsSlot(doc.status)
  const willHold = holdsSlot(status)

  if (wasHolding && !willHold) {
    assertApplied(
      await Booking.updateOne(guard, { $set: { status }, $unset: { specialistSlotKey: 1 } })
    )
    if (doc.specialist === "any") await releaseAnySlot(doc)
  } else if (!wasHolding && willHold) {
    await withSlot(doc, async (slotFields) =>
      assertApplied(await Booking.updateOne(guard, { $set: { status, ...slotFields } }))
    )
  } else {
    assertApplied(await Booking.updateOne(guard, { $set: { status } }))
  }
}

/** Each booking is updated independently; failures are reported, never hidden. */
export async function updateStatuses(ids: string[], status: BookingStatus) {
  const result: { updated: string[]; failed: { id: string; code: FailureCode }[] } = {
    updated: [],
    failed: [],
  }
  for (const id of new Set(ids)) {
    try {
      await updateOneStatus(id, status)
      result.updated.push(id)
    } catch (err) {
      if (err instanceof AppError && FAILURE_CODES.has(err.code)) {
        result.failed.push({ id, code: err.code as FailureCode })
      } else {
        throw err
      }
    }
  }
  return result
}

export async function updateNotes(id: string, notes: string): Promise<BookingDto> {
  const doc = await Booking.findByIdAndUpdate(
    parseObjectId(id),
    { $set: { notes } },
    { new: true, runValidators: true }
  ).lean()
  if (!doc) throw notFound()
  return toBookingDto(doc)
}

/** Hard delete; unknown ids are ignored, like the dashboard mock. */
export async function deleteBookings(ids: string[]): Promise<void> {
  for (const id of new Set(ids)) {
    const doc = await Booking.findByIdAndDelete(id).lean()
    // A named booking's slot key is deleted with the document.
    if (doc && doc.specialist === "any" && holdsSlot(doc.status)) await releaseAnySlot(doc)
  }
}
