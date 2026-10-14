import type { Request, RequestHandler } from "express"

import { AppError } from "../lib/app-error"
import { ACCESS_COOKIE } from "../lib/auth-cookies"
import { verifyAccessToken } from "../lib/tokens"
import type { Role } from "../modules/auth/user.model"

const unauthenticated = () => new AppError(401, "UNAUTHENTICATED", "Please sign in")

/** Optional auth: an invalid or expired cookie is ignored (the client refreshes on 401). */
export const attachUser: RequestHandler = (req, _res, next) => {
  const token: unknown = req.cookies?.[ACCESS_COOKIE]
  if (typeof token === "string") {
    const claims = verifyAccessToken(token)
    if (claims) req.user = { id: claims.sub, role: claims.role }
  }
  next()
}

export function currentUser(req: Request): { id: string; role: Role } {
  if (!req.user) throw unauthenticated()
  return req.user
}

export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    const user = currentUser(req)
    if (!roles.includes(user.role)) {
      throw new AppError(403, "FORBIDDEN", "You don't have access to this")
    }
    next()
  }
}
