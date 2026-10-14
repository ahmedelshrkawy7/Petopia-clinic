import * as React from "react"

import { bookingsService } from "@/services"
import type { BookingListQuery } from "@/types/booking"

type AsyncState<T> = {
  data: T | undefined
  error: Error | null
  loading: boolean
  refetch: () => void
}

/**
 * Runs `fetcher` whenever `key` changes and again whenever bookings change.
 * Previous data is kept while refetching so tables don't flash empty.
 */
function useServiceQuery<T>(key: string, fetcher: () => Promise<T>): AsyncState<T> {
  const [version, setVersion] = React.useState(0)
  const requestId = `${version}:${key}`
  const [result, setResult] = React.useState<{
    requestId: string
    data: T | undefined
    error: Error | null
  }>()
  const fetcherRef = React.useRef(fetcher)
  React.useLayoutEffect(() => {
    fetcherRef.current = fetcher
  })

  React.useEffect(
    () => bookingsService.subscribe(() => setVersion((v) => v + 1)),
    []
  )

  React.useEffect(() => {
    let active = true
    fetcherRef
      .current()
      .then((data) => {
        if (active) setResult({ requestId, data, error: null })
      })
      .catch((err: unknown) => {
        if (!active) return
        const error = err instanceof Error ? err : new Error(String(err))
        setResult((prev) => ({ requestId, data: prev?.data, error }))
      })
    return () => {
      active = false
    }
  }, [requestId])

  const refetch = React.useCallback(() => setVersion((v) => v + 1), [])
  const loading = result?.requestId !== requestId
  return {
    data: result?.data,
    // Hide a stale error while retrying so the UI shows the loading state.
    error: loading ? null : (result?.error ?? null),
    loading,
    refetch,
  }
}

export function useBookingList(query: BookingListQuery) {
  return useServiceQuery(JSON.stringify(query), () => bookingsService.list(query))
}

export function useBooking(id: string) {
  return useServiceQuery(id, () => bookingsService.get(id))
}

export function useBookingStats() {
  return useServiceQuery("stats", () => bookingsService.stats())
}

export function useTodayBookings(date: string) {
  return useServiceQuery(`today:${date}`, () =>
    bookingsService.listAll({ from: date, to: date, sort: "date-asc" })
  )
}

export function useRecentBookings(limit = 5) {
  return useServiceQuery(`recent:${limit}`, () =>
    bookingsService.list({ sort: "created-desc", pageSize: limit })
  )
}
