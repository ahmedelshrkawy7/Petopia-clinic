// Creates or updates the admin account from ADMIN_* env vars: npm run seed:admin
import mongoose from "mongoose"
import { z } from "zod"

import { env } from "../src/config/env"
import { connectDb } from "../src/db/connect"
import { hashPassword } from "../src/lib/passwords"
import { User } from "../src/modules/auth/user.model"

const admin = z
  .object({
    ADMIN_EMAIL: z.string().trim().toLowerCase().pipe(z.email()),
    ADMIN_PASSWORD: z.string().min(8, { error: "ADMIN_PASSWORD must be at least 8 characters" }),
    ADMIN_NAME: z.string().trim().min(2).default("Clinic Admin"),
  })
  .parse(process.env)

await connectDb(env.MONGODB_URI)
await User.findOneAndUpdate(
  { email: admin.ADMIN_EMAIL },
  {
    $set: {
      name: admin.ADMIN_NAME,
      role: "admin",
      passwordHash: await hashPassword(admin.ADMIN_PASSWORD),
    },
    // A reseed (e.g. a password change) signs out existing admin sessions.
    $inc: { refreshTokenVersion: 1 },
  },
  { upsert: true }
)
console.log(`Admin ready: ${admin.ADMIN_EMAIL}`)
await mongoose.disconnect()
