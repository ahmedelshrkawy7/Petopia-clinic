// The single place to swap mock services for real ones (API, Supabase, …).
// Pages and hooks only import from here, never from the mock files directly.
import { createMockAuthService } from "@/services/auth/mock-auth-service"
import { createMockBookingsService } from "@/services/bookings/mock-bookings-service"

const mockBookings = createMockBookingsService()

export const authService = createMockAuthService()
export const bookingsService = mockBookings.service

/** Only available while running on mock data; undefined with a real backend. */
export const resetDemoData: (() => void) | undefined = mockBookings.resetDemoData

export type { AuthService, AuthSession, AuthUser } from "@/services/auth/auth-service"
export { AuthError } from "@/services/auth/auth-service"
export type { BookingsService } from "@/services/bookings/bookings-service"
