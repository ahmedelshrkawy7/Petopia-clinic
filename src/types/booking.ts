import type {
  PET_TYPES,
  SERVICES,
  SPECIALISTS,
  TIME_SLOTS,
} from "@/lib/booking-schema"

export const BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
] as const

export type BookingStatus = (typeof BOOKING_STATUSES)[number]
export type PetType = (typeof PET_TYPES)[number]
export type ServiceValue = (typeof SERVICES)[number]["value"]
export type SpecialistValue = (typeof SPECIALISTS)[number]["value"]
export type TimeSlot = (typeof TIME_SLOTS)[number]

export type Booking = {
  id: string
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  status: BookingStatus
  notes: string
  petType: PetType
  service: ServiceValue
  specialist: SpecialistValue
  date: string // "yyyy-MM-dd", the appointment day in local time
  time: TimeSlot
  fullName: string
  phone: string
  petInfo: string
}

export type BookingSort = "date-asc" | "date-desc" | "created-desc" | "created-asc"

export type BookingFilters = {
  search?: string
  status?: BookingStatus[]
  service?: ServiceValue[]
  petType?: PetType[]
  from?: string // "yyyy-MM-dd", inclusive
  to?: string // "yyyy-MM-dd", inclusive
}

export type BookingListQuery = BookingFilters & {
  sort?: BookingSort
  page?: number // 1-based
  pageSize?: number
}

export type BookingListResult = {
  items: Booking[]
  total: number
  page: number
  pageSize: number
}

export type BookingStats = {
  today: number
  upcomingWeek: number
  pending: number
  completedThisMonth: number
  perDay: { date: string; count: number }[] // last 14 days, oldest first
}
