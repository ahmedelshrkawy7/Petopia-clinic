import type { Role } from "../modules/auth/user.model"

declare global {
  namespace Express {
    interface Request {
      /** Set by attachUser when a valid access cookie is present. */
      user?: { id: string; role: Role }
    }
  }
}

export {}
