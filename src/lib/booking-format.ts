import { format, parseISO } from "date-fns"

import { SERVICES, SPECIALISTS } from "@/lib/booking-schema"
import type { Booking, BookingStatus, PetType } from "@/types/booking"

export const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
}

export const PET_LABELS: Record<PetType, string> = {
  dog: "Dog",
  cat: "Cat",
  exotic: "Exotic",
  other: "Other",
}

export const serviceLabel = (value: string) =>
  SERVICES.find((s) => s.value === value)?.label ?? value

export const specialistLabel = (value: string) =>
  value === "any"
    ? "Any available"
    : (SPECIALISTS.find((s) => s.value === value)?.label ?? value)

/** "09:00" → "9:00 AM" */
export function formatSlot(slot: string) {
  const [h, m] = slot.split(":").map(Number)
  const date = new Date()
  date.setHours(h, m, 0, 0)
  return format(date, "h:mm a")
}

export const formatDay = (day: string, pattern = "EEE, MMM d, yyyy") =>
  format(parseISO(day), pattern)

export const formatTimestamp = (iso: string) =>
  format(parseISO(iso), "MMM d, yyyy 'at' h:mm a")

export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`

export function bookingsToCsv(bookings: Booking[]) {
  const header = [
    "ID",
    "Status",
    "Date",
    "Time",
    "Customer",
    "Phone",
    "Pet type",
    "Pet",
    "Service",
    "Specialist",
    "Notes",
    "Created at",
  ]
  const rows = bookings.map((b) => [
    b.id,
    STATUS_LABELS[b.status],
    b.date,
    b.time,
    b.fullName,
    b.phone,
    PET_LABELS[b.petType],
    b.petInfo,
    serviceLabel(b.service),
    specialistLabel(b.specialist),
    b.notes,
    b.createdAt,
  ])
  const escape = (value: string) => {
    // Prefix formula-like cells so spreadsheets don't execute them.
    const safe = /^[=+\-@]/.test(value) ? `'${value}` : value
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
  }
  return [header, ...rows].map((row) => row.map(escape).join(",")).join("\n")
}

export function downloadFile(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
