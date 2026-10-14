/** An expected failure with an HTTP status and a stable code for the client. */
export class AppError extends Error {
  readonly status: number
  readonly code: string
  readonly fields?: Record<string, string>

  constructor(
    status: number,
    code: string,
    message: string,
    fields?: Record<string, string>
  ) {
    super(message)
    this.name = "AppError"
    this.status = status
    this.code = code
    this.fields = fields
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      ...(this.fields ? { fields: this.fields } : {}),
    }
  }
}

export const notFound = (what = "Booking") =>
  new AppError(404, "NOT_FOUND", `${what} not found`)

export function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: unknown }).code === 11000
  )
}
