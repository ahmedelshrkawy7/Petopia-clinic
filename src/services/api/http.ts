// Thin fetch wrapper for the Petopia API (server/). Auth lives in httpOnly
// cookies, so requests only need `credentials: "include"`.

const API_BASE = `${import.meta.env.VITE_API_URL ?? ""}/api`

/** An error response from the API: `{ error: { code, message, fields? } }`. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fields?: Record<string, string>

  constructor(status: number, code: string, message: string, fields?: Record<string, string>) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
    this.fields = fields
  }
}

type QueryValue = string | number | boolean | readonly string[] | undefined

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE"
  body?: unknown
  query?: Record<string, QueryValue>
}

const unauthorizedListeners = new Set<() => void>()

/** Fires when a request fails with 401 and the session can't be refreshed. */
export function onUnauthorized(listener: () => void) {
  unauthorizedListeners.add(listener)
  return () => {
    unauthorizedListeners.delete(listener)
  }
}

function toQueryString(query: Record<string, QueryValue>) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === "") continue
    if (Array.isArray(value)) {
      if (value.length) params.set(key, value.join(","))
    } else {
      params.set(key, String(value))
    }
  }
  const text = params.toString()
  return text ? `?${text}` : ""
}

// Concurrent 401s share one refresh call.
let refreshing: Promise<boolean> | null = null

function refreshSession() {
  refreshing ??= fetch(`${API_BASE}/auth/refresh`, { method: "POST", credentials: "include" })
    .then((res) => res.ok)
    .catch(() => false)
    .finally(() => {
      refreshing = null
    })
  return refreshing
}

async function send(path: string, { method = "GET", body, query }: RequestOptions) {
  try {
    return await fetch(`${API_BASE}${path}${query ? toQueryString(query) : ""}`, {
      method,
      credentials: "include",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "Can't reach the server. Check your connection and try again.")
  }
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let res = await send(path, options)

  // The access cookie lives 15 minutes; refresh once and retry. Auth routes
  // report their own 401s (e.g. wrong password) and are never retried.
  if (res.status === 401 && !path.startsWith("/auth/")) {
    if (await refreshSession()) res = await send(path, options)
    if (res.status === 401) unauthorizedListeners.forEach((listener) => listener())
  }

  if (res.status === 204) return undefined as T
  const data: unknown = await res.json().catch(() => null)
  if (!res.ok) {
    const error = (data as { error?: { code?: string; message?: string; fields?: Record<string, string> } } | null)?.error
    throw new ApiError(
      res.status,
      error?.code ?? "HTTP_ERROR",
      error?.message ?? `Request failed (${res.status}). Please try again.`,
      error?.fields
    )
  }
  return data as T
}
