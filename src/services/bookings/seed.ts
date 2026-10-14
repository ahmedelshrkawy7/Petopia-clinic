import { addDays, format, setHours, startOfToday, subDays } from "date-fns"

import { PET_TYPES, SERVICES, SPECIALISTS, TIME_SLOTS } from "@/lib/booking-schema"
import type { Booking, BookingStatus } from "@/types/booking"

const NAMES = [
  "Sarah Mitchell",
  "Omar Haddad",
  "Lina Park",
  "James O'Connor",
  "Mariam Youssef",
  "Daniel Reyes",
  "Aisha Rahman",
  "Tom Becker",
  "Nour El-Din",
  "Emily Carter",
  "Yusuf Kaya",
  "Hannah Schmidt",
  "Karim Mansour",
  "Grace Liu",
  "Leo Martins",
]

const PETS: Record<(typeof PET_TYPES)[number], string[]> = {
  dog: ["Max, 3 yrs", "Bella, 5 yrs", "Rocky, 8 months", "Luna, 2 yrs"],
  cat: ["Milo, 4 yrs", "Simba, 1 yr", "Nala, 6 yrs", "Oliver, 10 yrs"],
  exotic: ["Kiwi (parrot), 2 yrs", "Spike (iguana), 4 yrs"],
  other: ["Coco (rabbit), 1 yr", "Peanut (hamster), 6 months"],
}

// Small deterministic PRNG so the seed looks the same on every reset.
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
}

export function createSeedBookings(count = 26): Booking[] {
  const random = rng(42)
  const pick = <T,>(items: readonly T[]) =>
    items[Math.floor(random() * items.length)]
  const today = startOfToday()

  return Array.from({ length: count }, (_, i) => {
    const offset = Math.round(random() * 22) - 10 // -10 … +12 days
    const day = addDays(today, offset)
    const petType = pick(PET_TYPES)
    const createdAt = setHours(
      subDays(today, Math.max(0, -offset) + Math.floor(random() * 6)),
      8 + Math.floor(random() * 10)
    )

    let status: BookingStatus
    const roll = random()
    if (offset < 0) status = roll < 0.85 ? "completed" : "cancelled"
    else if (offset === 0) status = roll < 0.7 ? "confirmed" : "pending"
    else status = roll < 0.45 ? "confirmed" : roll < 0.92 ? "pending" : "cancelled"

    const phoneDigits = String(Math.floor(1e7 + random() * 9e7))
    return {
      id: `seed-${i + 1}`,
      createdAt: createdAt.toISOString(),
      updatedAt: createdAt.toISOString(),
      status,
      notes: "",
      petType,
      service: pick(SERVICES).value,
      specialist: pick(SPECIALISTS).value,
      date: format(day, "yyyy-MM-dd"),
      time: pick(TIME_SLOTS),
      fullName: pick(NAMES),
      phone: `+1 (555) ${phoneDigits.slice(0, 3)}-${phoneDigits.slice(3, 7)}`,
      petInfo: pick(PETS[petType]),
    }
  })
}
