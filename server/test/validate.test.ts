import { describe, expect, it } from "vitest"
import { z } from "zod"

import { AppError } from "../src/lib/app-error"
import { parse } from "../src/lib/validate"

const schema = z.object({
  name: z.string().min(2, { error: "Too short" }),
  pet: z.object({ age: z.number({ error: "Age is required" }) }),
})

describe("parse", () => {
  it("returns parsed data on success", () => {
    expect(parse(schema, { name: "Jo", pet: { age: 3 } })).toEqual({
      name: "Jo",
      pet: { age: 3 },
    })
  })

  it("throws a 400 VALIDATION_ERROR keyed by field path", () => {
    try {
      parse(schema, { name: "J", pet: {} })
      expect.unreachable()
    } catch (err) {
      expect(err).toBeInstanceOf(AppError)
      const appError = err as AppError
      expect(appError.status).toBe(400)
      expect(appError.code).toBe("VALIDATION_ERROR")
      expect(appError.fields).toEqual({
        name: "Too short",
        "pet.age": "Age is required",
      })
    }
  })
})
