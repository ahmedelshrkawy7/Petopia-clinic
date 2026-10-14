import {
  addDays,
  format,
  isSameMonth,
  parseISO,
  startOfToday,
  subDays,
} from "date-fns"

import type { BookingFormValues } from "@/lib/booking-schema"
import type { BookingsService } from "@/services/bookings/bookings-service"
import { createSeedBookings } from "@/services/bookings/seed"
import {
  delay,
  maybeFail,
  readStorage,
  writeStorage,
} from "@/services/mock-utils"
import type {
  Booking,
  BookingListQuery,
  BookingStats,
} from "@/types/booking"

const STORAGE_KEY = "petopia:bookings"

function load(): Booking[] {
  const raw = readStorage(localStorage, STORAGE_KEY)
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed as Booking[]
    } catch {
      // Corrupt data; reseed below.
    }
  }
  const seeded = createSeedBookings()
  save(seeded)
  return seeded
}

function save(bookings: Booking[]) {
  writeStorage(localStorage, STORAGE_KEY, JSON.stringify(bookings))
}

const toKey = (date: Date) => format(date, "yyyy-MM-dd")

function applyFilters(bookings: Booking[], query: BookingListQuery) {
  const search = query.search?.trim().toLowerCase()
  const searchDigits = search?.replace(/\D/g, "")

  const filtered = bookings.filter((b) => {
    if (query.status?.length && !query.status.includes(b.status)) return false
    if (query.service?.length && !query.service.includes(b.service)) return false
    if (query.petType?.length && !query.petType.includes(b.petType)) return false
    if (query.from && b.date < query.from) return false
    if (query.to && b.date > query.to) return false
    if (search) {
      const text = `${b.fullName} ${b.petInfo}`.toLowerCase()
      const phoneMatch =
        !!searchDigits && b.phone.replace(/\D/g, "").includes(searchDigits)
      if (!text.includes(search) && !phoneMatch) return false
    }
    return true
  })

  const appointment = (b: Booking) => `${b.date}T${b.time}`
  const sorters: Record<string, (a: Booking, b: Booking) => number> = {
    "date-asc": (a, b) => appointment(a).localeCompare(appointment(b)),
    "date-desc": (a, b) => appointment(b).localeCompare(appointment(a)),
    "created-asc": (a, b) => a.createdAt.localeCompare(b.createdAt),
    "created-desc": (a, b) => b.createdAt.localeCompare(a.createdAt),
  }
  return filtered.sort(sorters[query.sort ?? "date-desc"])
}

export function createMockBookingsService() {
  const listeners = new Set<() => void>()
  const emit = () => listeners.forEach((listener) => listener())

  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY || event.key === null) emit()
  })

  const mutate = (fn: (bookings: Booking[]) => Booking[]) => {
    save(fn(load()))
    emit()
  }

  const service: BookingsService = {
    async create(values: BookingFormValues) {
      await delay()
      maybeFail()
      const now = new Date().toISOString()
      const booking: Booking = {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        status: "pending",
        notes: "",
        petType: values.petType,
        service: values.service,
        specialist: values.specialist,
        date: toKey(values.date),
        time: values.time,
        fullName: values.fullName,
        phone: values.phone,
        petInfo: values.petInfo,
      }
      mutate((all) => [booking, ...all])
      return booking
    },

    async list(query = {}) {
      await delay()
      maybeFail()
      const page = Math.max(1, query.page ?? 1)
      const pageSize = query.pageSize ?? 10
      const all = applyFilters(load(), query)
      return {
        items: all.slice((page - 1) * pageSize, page * pageSize),
        total: all.length,
        page,
        pageSize,
      }
    },

    async listAll(query = {}) {
      await delay(100, 250)
      maybeFail()
      return applyFilters(load(), query)
    },

    async get(id) {
      await delay()
      maybeFail()
      return load().find((b) => b.id === id) ?? null
    },

    async updateStatus(ids, status) {
      await delay()
      maybeFail()
      const now = new Date().toISOString()
      mutate((all) =>
        all.map((b) => (ids.includes(b.id) ? { ...b, status, updatedAt: now } : b))
      )
    },

    async updateNotes(id, notes) {
      await delay(150, 350)
      maybeFail()
      let updated: Booking | undefined
      mutate((all) =>
        all.map((b) => {
          if (b.id !== id) return b
          updated = { ...b, notes, updatedAt: new Date().toISOString() }
          return updated
        })
      )
      if (!updated) throw new Error("Booking not found")
      return updated
    },

    async remove(ids) {
      await delay()
      maybeFail()
      mutate((all) => all.filter((b) => !ids.includes(b.id)))
    },

    async stats(): Promise<BookingStats> {
      await delay()
      maybeFail()
      const all = load()
      const today = startOfToday()
      const todayKey = toKey(today)
      const weekEnd = toKey(addDays(today, 7))
      const active = all.filter((b) => b.status !== "cancelled")

      const perDay = Array.from({ length: 14 }, (_, i) => {
        const key = toKey(subDays(today, 13 - i))
        return {
          date: key,
          count: all.filter((b) => toKey(parseISO(b.createdAt)) === key).length,
        }
      })

      return {
        today: active.filter((b) => b.date === todayKey).length,
        upcomingWeek: active.filter((b) => b.date > todayKey && b.date <= weekEnd)
          .length,
        pending: all.filter((b) => b.status === "pending" && b.date >= todayKey)
          .length,
        completedThisMonth: all.filter(
          (b) => b.status === "completed" && isSameMonth(parseISO(b.date), today)
        ).length,
        perDay,
      }
    },

    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }

  const resetDemoData = () => {
    save(createSeedBookings())
    emit()
  }

  return { service, resetDemoData }
}
