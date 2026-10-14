import cookieParser from "cookie-parser"
import cors from "cors"
import express, { type Express } from "express"
import helmet from "helmet"
import mongoose from "mongoose"

import { env } from "./config/env"
import { AppError } from "./lib/app-error"
import { attachUser, requireRole } from "./middleware/auth"
import { errorHandler } from "./middleware/error-handler"
import { adminBookingsRouter } from "./modules/admin/admin-bookings.routes"
import { createAuthRouter } from "./modules/auth/auth.routes"
import { bookingsRouter } from "./modules/bookings/bookings.routes"

export type AppOptions = { authRateLimitMax?: number }

export function createApp({
  authRateLimitMax = env.AUTH_RATE_LIMIT_MAX,
}: AppOptions = {}): Express {
  const app = express()
  app.set("trust proxy", 1)
  app.use(helmet())
  app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }))
  app.use(express.json({ limit: "10kb" }))
  app.use(cookieParser())
  app.use(attachUser)

  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    })
  })
  app.use("/api/auth", createAuthRouter({ rateLimitMax: authRateLimitMax }))
  app.use("/api/bookings", bookingsRouter)
  app.use("/api/admin/bookings", requireRole("staff", "admin"), adminBookingsRouter)

  app.use("/api", () => {
    throw new AppError(404, "NOT_FOUND", "Route not found")
  })
  app.use(errorHandler)
  return app
}
