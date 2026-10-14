import { model, Schema } from "mongoose"

/** How many "any available" bookings hold each date+time slot. */
export interface SlotCounterRecord {
  date: string
  time: string
  anyCount: number
}

const slotCounterSchema = new Schema<SlotCounterRecord>({
  date: { type: String, required: true },
  time: { type: String, required: true },
  anyCount: { type: Number, default: 0, min: 0 },
})
slotCounterSchema.index({ date: 1, time: 1 }, { unique: true })

export const SlotCounter = model<SlotCounterRecord>("SlotCounter", slotCounterSchema)
