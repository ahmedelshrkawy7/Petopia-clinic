import { model, Schema, type Types } from "mongoose"

export const ROLES = ["owner", "staff", "admin"] as const
export type Role = (typeof ROLES)[number]

export interface UserRecord {
  _id: Types.ObjectId
  email: string
  passwordHash: string
  name: string
  phone?: string
  role: Role
  /** Bumped on logout; refresh tokens carrying an older version are rejected. */
  refreshTokenVersion: number
  createdAt: Date
  updatedAt: Date
}

const userSchema = new Schema<UserRecord>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    role: { type: String, enum: [...ROLES], default: "owner" },
    refreshTokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true }
)

export const User = model<UserRecord>("User", userSchema)

export type PublicUser = {
  id: string
  email: string
  name: string
  phone?: string
  role: Role
}

export function toPublicUser(
  user: Pick<UserRecord, "_id" | "email" | "name" | "phone" | "role">
): PublicUser {
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    ...(user.phone ? { phone: user.phone } : {}),
    role: user.role,
  }
}
