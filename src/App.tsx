import { lazy, Suspense } from "react"
import { BrowserRouter, Route, Routes } from "react-router"

import { AuthProvider } from "@/auth/auth-provider"
import { GuestOnly, RequireAuth } from "@/auth/route-guards"
import { FullPageLoader } from "@/components/admin/full-page-loader"
import { Toaster } from "@/components/ui/sonner"
import HomePage from "@/pages/home-page"
import NotFoundPage from "@/pages/not-found-page"

// Admin pages are split out so they don't add weight to the public site.
const LoginPage = lazy(() => import("@/pages/admin/login-page"))
const DashboardLayout = lazy(() => import("@/pages/admin/dashboard-layout"))
const OverviewPage = lazy(() => import("@/pages/admin/overview-page"))
const BookingsPage = lazy(() => import("@/pages/admin/bookings-page"))
const BookingDetailPage = lazy(() => import("@/pages/admin/booking-detail-page"))

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<FullPageLoader />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route element={<GuestOnly />}>
              <Route path="/admin/login" element={<LoginPage />} />
            </Route>
            <Route element={<RequireAuth />}>
              <Route path="/admin" element={<DashboardLayout />}>
                <Route index element={<OverviewPage />} />
                <Route path="bookings" element={<BookingsPage />} />
                <Route path="bookings/:id" element={<BookingDetailPage />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </AuthProvider>
      <Toaster position="top-right" richColors closeButton />
    </BrowserRouter>
  )
}

export default App
