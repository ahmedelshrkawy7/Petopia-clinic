import type { Response } from "express"

import { env } from "../config/env"
import { ACCESS_TTL_SECONDS } from "./tokens"

export const ACCESS_COOKIE = "access_token"
export const REFRESH_COOKIE = "refresh_token"
const REFRESH_PATH = "/api/auth"

const baseOptions = () => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env.NODE_ENV === "production",
})

type CookieTokens = {
  accessToken: string
  refreshToken: string
  remember: boolean
  expiresAtSec: number
}

/** Without "remember", cookies have no Max-Age and die with the browser session. */
export function setAuthCookies(res: Response, tokens: CookieTokens) {
  const persist = (maxAgeMs: number) => (tokens.remember ? { maxAge: maxAgeMs } : {})
  res.cookie(ACCESS_COOKIE, tokens.accessToken, {
    ...baseOptions(),
    path: "/",
    ...persist(ACCESS_TTL_SECONDS * 1000),
  })
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    ...baseOptions(),
    path: REFRESH_PATH,
    ...persist(tokens.expiresAtSec * 1000 - Date.now()),
  })
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE, { ...baseOptions(), path: "/" })
  res.clearCookie(REFRESH_COOKIE, { ...baseOptions(), path: REFRESH_PATH })
}
