import type { ErrorRequestHandler } from "express"
import mongoose from "mongoose"

import { AppError, isDuplicateKeyError } from "../lib/app-error"

function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err
  if (err instanceof mongoose.Error.CastError) {
    return new AppError(404, "NOT_FOUND", "Not found")
  }
  if (isDuplicateKeyError(err)) {
    return new AppError(409, "CONFLICT", "That record already exists")
  }
  const type = (err as { type?: unknown } | null)?.type
  if (type === "entity.parse.failed") {
    return new AppError(400, "INVALID_JSON", "Request body is not valid JSON")
  }
  if (type === "entity.too.large") {
    return new AppError(413, "PAYLOAD_TOO_LARGE", "Request body is too large")
  }
  return new AppError(500, "INTERNAL_ERROR", "Something went wrong. Please try again.")
}

// Express identifies error handlers by their four parameters.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const appError = toAppError(err)
  if (appError.status >= 500) console.error(err)
  res.status(appError.status).json({ error: appError.toJSON() })
}
