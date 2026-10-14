// The single place that picks service implementations.
// Pages and hooks only import from here, never from the implementation files.
import { createApiAuthService } from "@/services/api/api-auth-service"
import { createApiBookingsService } from "@/services/api/api-bookings-service"

export const authService = createApiAuthService()
export const bookingsService = createApiBookingsService()

export type { AuthService, AuthSession, AuthUser } from "@/services/auth/auth-service"
export { AuthError } from "@/services/auth/auth-service"
export type { BookingsService } from "@/services/bookings/bookings-service"
export { ApiError } from "@/services/api/http"
