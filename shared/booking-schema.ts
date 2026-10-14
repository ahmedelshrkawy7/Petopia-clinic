import { isToday, startOfToday } from "date-fns"
import { z } from "zod"

// Shared by the Vite frontend (via @shared) and the Express server.

export const PET_TYPES = ["dog", "cat", "exotic", "other"] as const

export const SERVICES = [
  { value: "wellness", label: "Comprehensive Wellness Exam" },
  { value: "vaccines", label: "Vaccines & Immunization" },
  { value: "dental", label: "Gentle Dental & Hygiene" },
  { value: "surgery", label: "Surgery Consultation" },
  { value: "diagnostics", label: "Ultrasound & Digital X-Ray" },
  { value: "spa", label: "Therapeutic Spa & Grooming" },
] as const

export const SPECIALISTS = [
  { value: "any", label: "Any Available Doctor (Fastest)" },
  { value: "clara-vance", label: "Dr. Clara Vance, DVM" },
] as const

// 24h "HH:mm" values so they can be compared against the current time.
export const TIME_SLOTS = ["09:00", "10:30", "13:15", "15:45", "17:00"] as const

export const BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
] as const

type Values<T extends readonly { value: string }[]> = T[number]["value"]
const values = <T extends readonly { value: string }[]>(items: T) =>
  items.map((item) => item.value) as [Values<T>, ...Values<T>[]]

export const SERVICE_VALUES = values(SERVICES)
export const SPECIALIST_VALUES = values(SPECIALISTS)

export type PetType = (typeof PET_TYPES)[number]
export type ServiceValue = Values<typeof SERVICES>
export type SpecialistValue = Values<typeof SPECIALISTS>
export type TimeSlot = (typeof TIME_SLOTS)[number]
export type BookingStatus = (typeof BOOKING_STATUSES)[number]

export function isSlotInPast(date: Date, slot: string) {
  if (!isToday(date)) return false
  const [hours, minutes] = slot.split(":").map(Number)
  const slotTime = new Date(date)
  slotTime.setHours(hours, minutes, 0, 0)
  return slotTime.getTime() <= Date.now()
}

/** A "yyyy-MM-dd" day that exists on the calendar (rejects 2026-02-31). */
export const dateKeySchema = z
  .string({ error: "Pick a date" })
  .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Use the yyyy-MM-dd format" })
  .refine(
    (value) => {
      const date = new Date(`${value}T00:00:00Z`)
      return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value)
    },
    { error: "Pick a real calendar date" }
  )

export const phoneSchema = z
  .string({ error: "Enter a valid phone number" })
  .trim()
  .regex(/^[+\d\s().-]+$/, { error: "Use digits, spaces, + ( ) - only" })
  .refine((v) => v.replace(/\D/g, "").length >= 7, {
    error: "Enter a valid phone number",
  })

const bookingFields = {
  petType: z.enum(PET_TYPES, { error: "Choose your pet type" }),
  service: z.enum(SERVICE_VALUES, { error: "Choose a service" }),
  specialist: z.enum(SPECIALIST_VALUES, { error: "Choose a specialist" }),
  time: z.enum(TIME_SLOTS, { error: "Pick a time slot" }),
  fullName: z
    .string({ error: "Enter your full name" })
    .trim()
    .min(2, { error: "Enter your full name" })
    .max(80, { error: "Name is too long" }),
  phone: phoneSchema,
  petInfo: z
    .string({ error: "Tell us your pet's name and age" })
    .trim()
    .min(2, { error: "Tell us your pet's name and age" })
    .max(80, { error: "Keep it under 80 characters" }),
}

/** The booking form (react-hook-form). `date` is a Date in the browser's zone. */
export const bookingSchema = z
  .object({
    ...bookingFields,
    date: z
      .date({ error: "Pick a date" })
      // Evaluated per call so a long-lived tab or server never uses a stale "today".
      .refine((date) => date >= startOfToday(), {
        error: "Pick today or a future date",
      }),
  })
  .refine((data) => !isSlotInPast(data.date, data.time), {
    path: ["time"],
    error: "That time has already passed today",
  })

/** JSON body for POST /api/bookings: same fields, `date` as "yyyy-MM-dd". */
export const bookingRequestSchema = z.object({
  ...bookingFields,
  date: dateKeySchema,
})

export type BookingFormInput = z.input<typeof bookingSchema>
export type BookingFormValues = z.output<typeof bookingSchema>
export type BookingRequest = z.output<typeof bookingRequestSchema>
