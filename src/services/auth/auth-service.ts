export type AuthUser = {
  id: string
  email: string
  name: string
}

export type AuthSession = {
  user: AuthUser
  expiresAt: number // epoch ms
}

export type LoginCredentials = {
  email: string
  password: string
  remember: boolean
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AuthError"
  }
}

export interface AuthService {
  login(credentials: LoginCredentials): Promise<AuthSession>
  logout(): Promise<void>
  /** Returns the current session, or null when missing or expired. */
  getSession(): Promise<AuthSession | null>
  /** Fires when the session changes (login, logout, or another tab). */
  onChange(listener: (session: AuthSession | null) => void): () => void
}
