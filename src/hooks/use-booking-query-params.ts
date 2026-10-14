import { useCallback, useMemo } from "react"
import { useSearchParams } from "react-router"

import { PET_TYPES, SERVICES } from "@/lib/booking-schema"
import {
  BOOKING_STATUSES,
  type BookingListQuery,
  type BookingSort,
} from "@/types/booking"

const SORTS: BookingSort[] = ["date-asc", "date-desc", "created-desc", "created-asc"]
export const PAGE_SIZES = [10, 20, 50] as const
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

// Keep only values we recognise so a hand-edited URL can't break the page.
function list<T extends string>(raw: string | null, allowed: readonly T[]) {
  const values = (raw ?? "").split(",").filter((v): v is T =>
    (allowed as readonly string[]).includes(v)
  )
  return values.length ? values : undefined
}

/** Bookings list filters, sort and paging, stored in the URL. */
export function useBookingQueryParams() {
  const [params, setParams] = useSearchParams()

  const query = useMemo<BookingListQuery>(() => {
    const sort = params.get("sort") as BookingSort | null
    const pageSize = Number(params.get("size"))
    const from = params.get("from")
    const to = params.get("to")
    return {
      search: params.get("q") ?? undefined,
      status: list(params.get("status"), BOOKING_STATUSES),
      service: list(params.get("service"), SERVICES.map((s) => s.value)),
      petType: list(params.get("pet"), PET_TYPES),
      from: from && DATE_RE.test(from) ? from : undefined,
      to: to && DATE_RE.test(to) ? to : undefined,
      sort: sort && SORTS.includes(sort) ? sort : "date-desc",
      page: Math.max(1, Number(params.get("page")) || 1),
      pageSize: (PAGE_SIZES as readonly number[]).includes(pageSize) ? pageSize : 10,
    }
  }, [params])

  const update = useCallback(
    (patch: Partial<BookingListQuery>, { resetPage = true } = {}) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          const set = (key: string, value: string | undefined) =>
            value ? next.set(key, value) : next.delete(key)
          if ("search" in patch) set("q", patch.search?.trim() || undefined)
          if ("status" in patch) set("status", patch.status?.join(","))
          if ("service" in patch) set("service", patch.service?.join(","))
          if ("petType" in patch) set("pet", patch.petType?.join(","))
          if ("from" in patch) set("from", patch.from)
          if ("to" in patch) set("to", patch.to)
          if ("sort" in patch) set("sort", patch.sort)
          if ("pageSize" in patch) set("size", String(patch.pageSize))
          if ("page" in patch) set("page", patch.page && patch.page > 1 ? String(patch.page) : undefined)
          else if (resetPage) next.delete("page")
          return next
        },
        { replace: true }
      )
    },
    [setParams]
  )

  const reset = useCallback(() => setParams({}, { replace: true }), [setParams])

  const hasFilters = Boolean(
    query.search ||
      query.status ||
      query.service ||
      query.petType ||
      query.from ||
      query.to
  )

  return { query, update, reset, hasFilters }
}
