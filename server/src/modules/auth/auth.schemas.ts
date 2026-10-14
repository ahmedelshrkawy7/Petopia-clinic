import { phoneSchema } from "@shared/booking-schema"
import { z } from "zod"

const email = z
  .string({ error: "Enter a valid email" })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Enter a valid email" }))

export const registerSchema = z.object({
  name: z
    .string({ error: "Enter your name" })
    .trim()
    .min(2, { error: "Enter your name" })
    .max(80, { error: "Name is too long" }),
  email,
  password: z
    .string({ error: "Choose a password" })
    .min(8, { error: "Use at least 8 characters" })
    .max(128, { error: "Use at most 128 characters" }),
  phone: phoneSchema.optional(),
})

export const loginSchema = z.object({
  email: z.string({ error: "Enter your email" }).trim().toLowerCase(),
  password: z.string({ error: "Enter your password" }).min(1, { error: "Enter your password" }),
  remember: z.boolean().default(false),
})

export type RegisterInput = z.output<typeof registerSchema>
export type LoginInput = z.output<typeof loginSchema>
