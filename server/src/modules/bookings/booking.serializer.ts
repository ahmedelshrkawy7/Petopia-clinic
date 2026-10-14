import type { BookingRecord } from "./booking.model"

/** Exactly the frontend's `Booking` type (src/types/booking.ts). */
export type BookingDto = {
  id: string
  createdAt: string
  updatedAt: string
  status: BookingRecord["status"]
  notes: string
  petType: BookingRecord["petType"]
  service: BookingRecord["service"]
  specialist: BookingRecord["specialist"]
  date: string
  time: BookingRecord["time"]
  fullName: string
  phone: string
  petInfo: string
}

export type OwnerBookingDto = Omit<BookingDto, "notes">

export function toBookingDto(b: BookingRecord): BookingDto {
  return {
    id: b._id.toString(),
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
    status: b.status,
    notes: b.notes,
    petType: b.petType,
    service: b.service,
    specialist: b.specialist,
    date: b.date,
    time: b.time,
    fullName: b.fullName,
    phone: b.phone,
    petInfo: b.petInfo,
  }
}

/** Staff notes are internal and never shown to pet owners. */
export function toOwnerBookingDto(b: BookingRecord): OwnerBookingDto {
  const dto: Partial<BookingDto> = toBookingDto(b)
  delete dto.notes
  return dto as OwnerBookingDto
}
