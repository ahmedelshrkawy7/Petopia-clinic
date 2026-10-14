import type { FilterQuery } from "mongoose"

import { AppError, notFound } from "../../lib/app-error"
import { parseObjectId } from "../../lib/object-id"
import { Booking, type BookingRecord } from "../bookings/booking.model"
import { toBookingDto, type BookingDto } from "../bookings/booking.serializer"
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
