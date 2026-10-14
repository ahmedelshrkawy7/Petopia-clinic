import {
  BOOKING_STATUSES,
  dateKeySchema,
  PET_TYPES,
  SERVICE_VALUES,
} from "@shared/booking-schema"
import { z } from "zod"

import { objectIdSchema } from "../../lib/object-id"

export const BOOKING_SORTS = ["date-asc", "date-desc", "created-asc", "created-desc"] as const
export type BookingSort = (typeof BOOKING_SORTS)[number]

/** Accepts `?status=a&status=b` and `?status=a,b`. */
function toList(value: unknown) {
  if (value === undefined || value === "") return undefined
  const raw = Array.isArray(value) ? value : [value]
  const items = raw.flatMap((v) => String(v).split(",")).map((v) => v.trim()).filter(Boolean)
  return items.length ? items : undefined
}

const listOf = <T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess(toList, z.array(z.enum(values)).optional())

const emptyAsUndefined = (value: unknown) => (value === "" ? undefined : value)

export const filtersSchema = z.object({
  search: z.preprocess(emptyAsUndefined, z.string().trim().max(100).optional()),
  status: listOf(BOOKING_STATUSES),
  service: listOf(SERVICE_VALUES),
  petType: listOf(PET_TYPES),
  from: z.preprocess(emptyAsUndefined, dateKeySchema.optional()),
  to: z.preprocess(emptyAsUndefined, dateKeySchema.optional()),
  sort: z.preprocess(emptyAsUndefined, z.enum(BOOKING_SORTS).default("date-desc")),
})

export const listQuerySchema = filtersSchema.extend({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
})

export type Filters = z.output<typeof filtersSchema>
export type ListQuery = z.output<typeof listQuerySchema>

const idsSchema = z.array(objectIdSchema).min(1).max(500)

export const statusBodySchema = z.object({
  ids: idsSchema,
  status: z.enum(BOOKING_STATUSES, { error: "Choose a valid status" }),
})

export const notesBodySchema = z.object({
  notes: z.string().max(2000, { error: "Keep notes under 2000 characters" }),
})

export const idsBodySchema = z.object({ ids: idsSchema })
