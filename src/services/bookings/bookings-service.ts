import type { BookingFormValues } from "@/lib/booking-schema"
import type {
  Booking,
  BookingListQuery,
  BookingListResult,
  BookingStats,
  BookingStatus,
} from "@/types/booking"

export interface BookingsService {
  create(values: BookingFormValues): Promise<Booking>
  list(query?: BookingListQuery): Promise<BookingListResult>
  /** Every booking matching the filters, ignoring pagination (for CSV export). */
  listAll(query?: BookingListQuery): Promise<Booking[]>
  get(id: string): Promise<Booking | null>
  updateStatus(ids: string[], status: BookingStatus): Promise<void>
  updateNotes(id: string, notes: string): Promise<Booking>
  remove(ids: string[]): Promise<void>
  stats(): Promise<BookingStats>
  /** Notifies when bookings change (create/update/delete), including from other tabs. */
  subscribe(listener: () => void): () => void
}
