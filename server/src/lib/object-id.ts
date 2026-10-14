import { z } from "zod"

import { notFound } from "./app-error"

export const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, { error: "Invalid id" })

/** Malformed ids are treated like unknown ones: 404, no information leak. */
export function parseObjectId(id: string, what = "Booking"): string {
  if (!objectIdSchema.safeParse(id).success) throw notFound(what)
  return id
}
