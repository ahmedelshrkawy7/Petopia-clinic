/* eslint-disable react-refresh/only-export-components */
import * as React from "react"
import { toast } from "sonner"

import { authService, type AuthSession, type AuthUser } from "@/services"
import type { LoginCredentials } from "@/services/auth/auth-service"

type AuthStatus = "loading" | "authenticated" | "guest"

type AuthContextValue = {
  status: AuthStatus
  user: AuthUser | null
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = React.createContext<AuthContextValue | undefined>(
  undefined
)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<AuthSession | null>(null)
  const [status, setStatus] = React.useState<AuthStatus>("loading")

  React.useEffect(() => {
    let active = true
    authService.getSession().then((current) => {
      if (!active) return
      setSession(current)
      setStatus(current ? "authenticated" : "guest")
    })
    const unsubscribe = authService.onChange((next) => {
      setSession(next)
      setStatus(next ? "authenticated" : "guest")
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  // Log out automatically when the session reaches its expiry time.
  React.useEffect(() => {
    if (!session) return
    const remaining = session.expiresAt - Date.now()
    // setTimeout overflows past ~24.8 days; sessions are far shorter.
    const timer = setTimeout(() => {
      authService.logout()
      toast.info("Your session has expired. Please sign in again.")
    }, Math.max(0, remaining))
    return () => clearTimeout(timer)
  }, [session])

  const value = React.useMemo<AuthContextValue>(
    () => ({
      status,
      user: session?.user ?? null,
      login: async (credentials) => {
        await authService.login(credentials)
      },
      logout: () => authService.logout(),
    }),
    [status, session]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = React.useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within an AuthProvider")
  return context
}
