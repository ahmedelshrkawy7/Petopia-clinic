import { format } from "date-fns"

import type { BookingFormValues } from "@/lib/booking-schema"
import { api, ApiError } from "@/services/api/http"
import type { BookingsService } from "@/services/bookings/bookings-service"
import type {
  Booking,
  BookingListQuery,
  BookingListResult,
  BookingStats,
} from "@/types/booking"

type StatusResult = {
  updated: string[]
  failed: { id: string; code: "NOT_FOUND" | "SLOT_TAKEN" | "CONFLICT" }[]
}

function filterParams(query: BookingListQuery = {}) {
  const { search, status, service, petType, from, to, sort } = query
  return { search, status, service, petType, from, to, sort }
}

function describeFailures(failed: StatusResult["failed"]) {
  const count = (code: StatusResult["failed"][number]["code"]) =>
    failed.filter((f) => f.code === code).length
  const plural = (n: number) => (n === 1 ? "1 booking" : `${n} bookings`)
  const parts = [
    count("SLOT_TAKEN") && `${plural(count("SLOT_TAKEN"))} couldn't be re-activated because the time slot is taken`,
    count("NOT_FOUND") && `${plural(count("NOT_FOUND"))} no longer exist`,
    count("CONFLICT") && `${plural(count("CONFLICT"))} changed in the meantime. Refresh and try again`,
  ].filter(Boolean)
  return `${parts.join("; ")}.`
}

export function createApiBookingsService(): BookingsService {
  const listeners = new Set<() => void>()
  const emit = () => listeners.forEach((listener) => listener())

  // Other tabs refetch when this one changes bookings.
  const channel =
    typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("petopia:bookings")
  channel?.addEventListener("message", emit)
  const notify = () => {
    emit()
    channel?.postMessage("changed")
  }

  return {
    async create(values: BookingFormValues) {
      const booking = await api<Booking>("/bookings", {
        method: "POST",
        // The API takes the appointment day as "yyyy-MM-dd".
        body: { ...values, date: format(values.date, "yyyy-MM-dd") },
      })
      notify()
      return booking
    },

    list(query = {}) {
      return api<BookingListResult>("/admin/bookings", {
        query: { ...filterParams(query), page: query.page, pageSize: query.pageSize },
      })
    },

    listAll(query = {}) {
      return api<Booking[]>("/admin/bookings/export", { query: filterParams(query) })
    },

    async get(id) {
      try {
        return await api<Booking>(`/admin/bookings/${encodeURIComponent(id)}`)
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) return null
        throw err
      }
    },

    async updateStatus(ids, status) {
      const result = await api<StatusResult>("/admin/bookings/status", {
        method: "PATCH",
        body: { ids, status },
      })
      if (result.updated.length) notify()
      if (result.failed.length) throw new Error(describeFailures(result.failed))
    },

    async updateNotes(id, notes) {
      const booking = await api<Booking>(`/admin/bookings/${encodeURIComponent(id)}/notes`, {
        method: "PATCH",
        body: { notes },
      })
      notify()
      return booking
    },

    async remove(ids) {
      await api("/admin/bookings/delete", { method: "POST", body: { ids } })
      notify()
    },

    stats() {
      return api<BookingStats>("/admin/bookings/stats")
    },

    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
