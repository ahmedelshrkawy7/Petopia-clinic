import { z } from "zod"

function isTimeZone(tz: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz })
    return true
  } catch {
    return false
  }
}

const secret = (name: string) =>
  z
    .string({ error: `${name} is required` })
    .min(32, { error: `${name} must be at least 32 characters` })

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(4000),
    MONGODB_URI: z
      .string({ error: "MONGODB_URI is required" })
      .min(1, { error: "MONGODB_URI is required" }),
    JWT_ACCESS_SECRET: secret("JWT_ACCESS_SECRET"),
    JWT_REFRESH_SECRET: secret("JWT_REFRESH_SECRET"),
    CLIENT_ORIGIN: z.url().default("http://localhost:5173"),
    ANY_SLOT_CAPACITY: z.coerce.number().int().min(1).default(2),
    CLINIC_TZ: z
      .string({ error: "CLINIC_TZ is required (an IANA zone like America/New_York)" })
      .refine(isTimeZone, {
        error: "CLINIC_TZ must be an IANA time zone like America/New_York",
      }),
    BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  })
  .refine((e) => e.JWT_ACCESS_SECRET !== e.JWT_REFRESH_SECRET, {
    path: ["JWT_REFRESH_SECRET"],
    error: "JWT_REFRESH_SECRET must differ from JWT_ACCESS_SECRET",
  })

export type Env = z.output<typeof envSchema>

export function parseEnv(raw: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(raw)
  if (result.success) return result.data
  const lines = result.error.issues.map(
    (issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`
  )
  throw new Error(`Invalid environment configuration:\n${lines.join("\n")}`)
}

export const env = parseEnv(process.env)
