import type { z } from "zod"

import { AppError } from "./app-error"

/** Parses `data` or throws a 400 whose `fields` match the form's field names. */
export function parse<S extends z.ZodType>(schema: S, data: unknown): z.output<S> {
  const result = schema.safeParse(data)
  if (result.success) return result.data

  const fields: Record<string, string> = {}
  for (const issue of result.error.issues) {
    const key = issue.path.join(".") || "_"
    fields[key] ??= issue.message
  }
  throw new AppError(400, "VALIDATION_ERROR", "Please check the highlighted fields", fields)
}
