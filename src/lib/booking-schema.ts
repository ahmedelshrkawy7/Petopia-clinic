import { isToday, startOfToday } from "date-fns"
import { z } from "zod"

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

type Values<T extends readonly { value: string }[]> = T[number]["value"]
const values = <T extends readonly { value: string }[]>(items: T) =>
  items.map((item) => item.value) as [Values<T>, ...Values<T>[]]

export function isSlotInPast(date: Date, slot: string) {
  if (!isToday(date)) return false
  const [hours, minutes] = slot.split(":").map(Number)
  const slotTime = new Date(date)
  slotTime.setHours(hours, minutes, 0, 0)
  return slotTime.getTime() <= Date.now()
}

export const bookingSchema = z
  .object({
    petType: z.enum(PET_TYPES, { error: "Choose your pet type" }),
    service: z.enum(values(SERVICES), { error: "Choose a service" }),
    specialist: z.enum(values(SPECIALISTS), { error: "Choose a specialist" }),
    date: z
      .date({ error: "Pick a date" })
      .min(startOfToday(), { error: "Pick today or a future date" }),
    time: z.enum(TIME_SLOTS, { error: "Pick a time slot" }),
    fullName: z
      .string()
      .trim()
      .min(2, { error: "Enter your full name" })
      .max(80, { error: "Name is too long" }),
    phone: z
      .string()
      .trim()
      .regex(/^[+\d\s().-]+$/, { error: "Use digits, spaces, + ( ) - only" })
      .refine((v) => v.replace(/\D/g, "").length >= 7, {
        error: "Enter a valid phone number",
      }),
    petInfo: z
      .string()
      .trim()
      .min(2, { error: "Tell us your pet's name and age" })
      .max(80, { error: "Keep it under 80 characters" }),
  })
  .refine((data) => !isSlotInPast(data.date, data.time), {
    path: ["time"],
    error: "That time has already passed today",
  })

export type BookingFormInput = z.input<typeof bookingSchema>
export type BookingFormValues = z.output<typeof bookingSchema>
