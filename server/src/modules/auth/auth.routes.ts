import { Router, type Request } from "express"
import { rateLimit } from "express-rate-limit"

import { AppError } from "../../lib/app-error"
import { clearAuthCookies, REFRESH_COOKIE, setAuthCookies } from "../../lib/auth-cookies"
import { parse } from "../../lib/validate"
import { loginSchema, registerSchema } from "./auth.schemas"
import * as auth from "./auth.service"

function refreshCookie(req: Request): string | undefined {
  const value: unknown = req.cookies?.[REFRESH_COOKIE]
  return typeof value === "string" ? value : undefined
}

export function createAuthRouter({ rateLimitMax }: { rateLimitMax: number }) {
  const router = Router()
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: rateLimitMax,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (_req, _res, next) =>
      next(new AppError(429, "RATE_LIMITED", "Too many attempts. Please try again in a few minutes.")),
  })

  router.post("/register", limiter, async (req, res) => {
    const issued = await auth.register(parse(registerSchema, req.body))
    setAuthCookies(res, issued)
    res.status(201).json(issued.session)
  })

  router.post("/login", limiter, async (req, res) => {
    const issued = await auth.login(parse(loginSchema, req.body))
    setAuthCookies(res, issued)
    res.json(issued.session)
  })

  router.post("/refresh", async (req, res) => {
    try {
      const issued = await auth.refresh(refreshCookie(req))
      setAuthCookies(res, issued)
      res.json(issued.session)
    } catch (err) {
      clearAuthCookies(res)
      throw err
    }
  })

  router.get("/session", async (req, res) => {
    res.json(await auth.getSession(refreshCookie(req)))
  })

  router.post("/logout", async (req, res) => {
    await auth.logout(refreshCookie(req))
    clearAuthCookies(res)
    res.status(204).end()
  })

  return router
}
