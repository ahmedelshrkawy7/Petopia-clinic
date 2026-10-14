import { randomUUID } from "node:crypto"
import jwt from "jsonwebtoken"

import { env } from "../config/env"
import { ROLES, type Role } from "../modules/auth/user.model"

export const ACCESS_TTL_SECONDS = 15 * 60
export const REMEMBER_TTL_SECONDS = 7 * 24 * 60 * 60
export const SESSION_TTL_SECONDS = 12 * 60 * 60

export type AccessClaims = { sub: string; role: Role }
/** `exp` is the absolute session end; refreshing never moves it. */
export type RefreshClaims = { sub: string; ver: number; remember: boolean; exp: number }

export function sessionExpiry(remember: boolean, nowMs = Date.now()): number {
  return Math.floor(nowMs / 1000) + (remember ? REMEMBER_TTL_SECONDS : SESSION_TTL_SECONDS)
}

export function signAccessToken(claims: AccessClaims): string {
  return jwt.sign(claims, env.JWT_ACCESS_SECRET, {
    algorithm: "HS256",
    expiresIn: ACCESS_TTL_SECONDS,
  })
}

export function verifyAccessToken(token: string): AccessClaims | null {
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ["HS256"] })
    if (typeof payload === "string" || typeof payload.sub !== "string") return null
    if (!ROLES.includes(payload.role)) return null
    return { sub: payload.sub, role: payload.role as Role }
  } catch {
    return null
  }
}

export function signRefreshToken(claims: RefreshClaims): string {
  // jti makes every rotated token distinct even within the same second.
  return jwt.sign({ ...claims, jti: randomUUID() }, env.JWT_REFRESH_SECRET, {
    algorithm: "HS256",
  })
}

export function verifyRefreshToken(token: string): RefreshClaims | null {
  try {
    const p = jwt.verify(token, env.JWT_REFRESH_SECRET, { algorithms: ["HS256"] })
    if (
      typeof p === "string" ||
      typeof p.sub !== "string" ||
      typeof p.ver !== "number" ||
      typeof p.remember !== "boolean" ||
      typeof p.exp !== "number"
    ) {
      return null
    }
    return { sub: p.sub, ver: p.ver, remember: p.remember, exp: p.exp }
  } catch {
    return null
  }
}
