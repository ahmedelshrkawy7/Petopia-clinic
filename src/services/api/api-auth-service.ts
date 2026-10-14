import {
  AuthError,
  type AuthService,
  type AuthSession,
  type LoginCredentials,
} from "@/services/auth/auth-service"
import { api, ApiError, onUnauthorized } from "@/services/api/http"

type ApiSession = AuthSession & { user: AuthSession["user"] & { role: string } }

// The dashboard is for clinic staff; pet-owner accounts can't sign in here.
const isStaff = (session: ApiSession) =>
  session.user.role === "staff" || session.user.role === "admin"

function toAuthSession({ user, expiresAt }: ApiSession): AuthSession {
  return { user: { id: user.id, email: user.email, name: user.name }, expiresAt }
}

export function createApiAuthService(): AuthService {
  const listeners = new Set<(session: AuthSession | null) => void>()
  const emit = (session: AuthSession | null) => listeners.forEach((l) => l(session))

  // Keep tabs in sync: logging in or out in one tab updates the others.
  const channel =
    typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("petopia:auth")
  channel?.addEventListener("message", (event: MessageEvent<AuthSession | null>) =>
    emit(event.data)
  )
  const broadcast = (session: AuthSession | null) => {
    emit(session)
    channel?.postMessage(session)
  }

  // A data request found the session gone (expired or revoked elsewhere).
  onUnauthorized(() => broadcast(null))

  return {
    async login({ email, password, remember }: LoginCredentials) {
      let session: ApiSession
      try {
        session = await api<ApiSession>("/auth/login", {
          method: "POST",
          body: { email, password, remember },
        })
      } catch (err) {
        if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
          throw new AuthError(err.message)
        }
        throw err
      }
      if (!isStaff(session)) {
        await api("/auth/logout", { method: "POST" }).catch(() => {})
        throw new AuthError("This account doesn't have access to the staff dashboard")
      }
      const authSession = toAuthSession(session)
      broadcast(authSession)
      return authSession
    },

    async logout() {
      await api("/auth/logout", { method: "POST" }).catch(() => {})
      broadcast(null)
    },

    async getSession() {
      try {
        const session = await api<ApiSession>("/auth/session")
        return isStaff(session) ? toAuthSession(session) : null
      } catch {
        // Signed out, expired, or server unreachable: show the login page.
        return null
      }
    },

    onChange(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
