import { Navigate, Outlet, useLocation, useSearchParams } from "react-router"

import { useAuth } from "@/auth/auth-provider"
import { FullPageLoader } from "@/components/admin/full-page-loader"

/** Only lets authenticated users through; guests go to the login page. */
export function RequireAuth() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === "loading") return <FullPageLoader />
  if (status === "guest") {
    const redirect = location.pathname + location.search
    return (
      <Navigate
        to={`/admin/login?redirect=${encodeURIComponent(redirect)}`}
        replace
      />
    )
  }
  return <Outlet />
}

/** Keeps signed-in users away from the login page. */
export function GuestOnly() {
  const { status } = useAuth()
  const [params] = useSearchParams()

  if (status === "loading") return <FullPageLoader />
  if (status === "authenticated") {
    return <Navigate to={safeRedirect(params.get("redirect"))} replace />
  }
  return <Outlet />
}

/** Only allow in-app admin paths, so `?redirect=` can't send users off-site. */
function safeRedirect(value: string | null) {
  if (value && value.startsWith("/admin") && !value.startsWith("//")) {
    return value
  }
  return "/admin"
}
