import {
  AuthError,
  type AuthService,
  type AuthSession,
  type LoginCredentials,
} from "@/services/auth/auth-service"
import {
  delay,
  readStorage,
  removeStorage,
  writeStorage,
} from "@/services/mock-utils"

// DEMO ONLY: these credentials ship in the client bundle. Real auth must be
// enforced by the backend once it exists.
const DEMO_EMAIL = import.meta.env.VITE_DEMO_ADMIN_EMAIL ?? "admin@petopia.com"
const DEMO_PASSWORD = import.meta.env.VITE_DEMO_ADMIN_PASSWORD ?? "petopia123"

const SESSION_KEY = "petopia:session"
const REMEMBER_TTL = 7 * 24 * 60 * 60 * 1000
const SESSION_TTL = 2 * 60 * 60 * 1000

function isSession(value: unknown): value is AuthSession {
  const v = value as AuthSession | null
  return (
    !!v &&
    typeof v.expiresAt === "number" &&
    typeof v.user?.email === "string"
  )
}

function readSession(): AuthSession | null {
  for (const storage of [sessionStorage, localStorage]) {
    const raw = readStorage(storage, SESSION_KEY)
    if (!raw) continue
    try {
      const parsed: unknown = JSON.parse(raw)
      if (isSession(parsed) && parsed.expiresAt > Date.now()) return parsed
    } catch {
      // Corrupt entry; fall through and clear it.
    }
    removeStorage(storage, SESSION_KEY)
  }
  return null
}

export function createMockAuthService(): AuthService {
  const listeners = new Set<(session: AuthSession | null) => void>()
  const emit = () => {
    const session = readSession()
    listeners.forEach((listener) => listener(session))
  }

  // Keep tabs in sync: logging out in one tab logs out the others.
  window.addEventListener("storage", (event) => {
    if (event.key === SESSION_KEY || event.key === null) emit()
  })

  return {
    async login({ email, password, remember }: LoginCredentials) {
      await delay(500, 900)
      const valid =
        email.trim().toLowerCase() === DEMO_EMAIL.toLowerCase() &&
        password === DEMO_PASSWORD
      if (!valid) throw new AuthError("Incorrect email or password")

      const session: AuthSession = {
        user: { id: "demo-admin", email: DEMO_EMAIL, name: "Clinic Admin" },
        expiresAt: Date.now() + (remember ? REMEMBER_TTL : SESSION_TTL),
      }
      removeStorage(localStorage, SESSION_KEY)
      removeStorage(sessionStorage, SESSION_KEY)
      writeStorage(
        remember ? localStorage : sessionStorage,
        SESSION_KEY,
        JSON.stringify(session)
      )
      emit()
      return session
    },

    async logout() {
      removeStorage(localStorage, SESSION_KEY)
      removeStorage(sessionStorage, SESSION_KEY)
      emit()
    },

    async getSession() {
      return readSession()
    },

    onChange(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
