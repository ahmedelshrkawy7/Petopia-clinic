import { describe, expect, it } from "vitest"

import { parseEnv } from "../src/config/env"

const valid = {
  MONGODB_URI: "mongodb://127.0.0.1:27017/petopia",
  JWT_ACCESS_SECRET: "a".repeat(32),
  JWT_REFRESH_SECRET: "b".repeat(32),
  CLINIC_TZ: "America/New_York",
}

describe("parseEnv", () => {
  it("applies defaults", () => {
    expect(parseEnv(valid)).toMatchObject({
      NODE_ENV: "development",
      PORT: 4000,
      CLIENT_ORIGIN: "http://localhost:5173",
      ANY_SLOT_CAPACITY: 2,
      BCRYPT_ROUNDS: 12,
      AUTH_RATE_LIMIT_MAX: 10,
    })
  })

  it("requires CLINIC_TZ", () => {
    const { CLINIC_TZ: _omit, ...rest } = valid
    expect(() => parseEnv(rest)).toThrow(/CLINIC_TZ/)
  })

  it("rejects an unknown time zone", () => {
    expect(() => parseEnv({ ...valid, CLINIC_TZ: "Mars/Olympus" })).toThrow(/IANA/)
  })

  it("rejects a short secret", () => {
    expect(() => parseEnv({ ...valid, JWT_ACCESS_SECRET: "short" })).toThrow(
      /JWT_ACCESS_SECRET/
    )
  })

  it("rejects identical secrets", () => {
    expect(() =>
      parseEnv({ ...valid, JWT_REFRESH_SECRET: valid.JWT_ACCESS_SECRET })
    ).toThrow(/JWT_REFRESH_SECRET/)
  })

  it("lists every problem in one readable message", () => {
    expect(() => parseEnv({})).toThrow(/Invalid environment configuration/)
  })
})
