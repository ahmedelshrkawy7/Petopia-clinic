import {
  BOOKING_STATUSES,
  PET_TYPES,
  SERVICE_VALUES,
  SPECIALIST_VALUES,
  TIME_SLOTS,
  type BookingStatus,
  type PetType,
  type ServiceValue,
  type SpecialistValue,
  type TimeSlot,
} from "@shared/booking-schema"
import { model, Schema, type Types } from "mongoose"

export interface BookingRecord {
  _id: Types.ObjectId
  petType: PetType
  service: ServiceValue
  specialist: SpecialistValue
  /** "yyyy-MM-dd", clinic-local day */
  date: string
  time: TimeSlot
  fullName: string
  phone: string
  /** `phone` without formatting, for search */
  phoneDigits: string
  petInfo: string
  status: BookingStatus
  notes: string
  userId?: Types.ObjectId
  /** "date|time|specialist" while a named-specialist booking holds its slot */
  specialistSlotKey?: string
  createdAt: Date
  updatedAt: Date
}

const bookingSchema = new Schema<BookingRecord>(
  {
    petType: { type: String, enum: [...PET_TYPES], required: true },
    service: { type: String, enum: [...SERVICE_VALUES], required: true },
    specialist: { type: String, enum: [...SPECIALIST_VALUES], required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    time: { type: String, enum: [...TIME_SLOTS], required: true },
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    phoneDigits: { type: String, required: true },
    petInfo: { type: String, required: true },
    status: { type: String, enum: [...BOOKING_STATUSES], default: "pending" },
    notes: { type: String, default: "", maxlength: 2000 },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    specialistSlotKey: { type: String },
  },
  { timestamps: true }
)

// The double-booking guard for named specialists: MongoDB rejects a second holder.
bookingSchema.index(
  { specialistSlotKey: 1 },
  { unique: true, partialFilterExpression: { specialistSlotKey: { $exists: true } } }
)
bookingSchema.index({ date: 1, time: 1 })
bookingSchema.index({ createdAt: -1 })
bookingSchema.index({ userId: 1, date: -1 })

export const Booking = model<BookingRecord>("Booking", bookingSchema)
