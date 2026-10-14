/** Simulates network latency so loading states are exercised during development. */
export function delay(min = 250, max = 600) {
  const ms = min + Math.random() * (max - min)
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Set `localStorage["petopia:mock-fail"] = "1"` to make every mock request fail. */
export function maybeFail() {
  if (readStorage(localStorage, "petopia:mock-fail") === "1") {
    throw new Error("Simulated network error. Please try again.")
  }
}

// Storage can throw in private mode or when blocked; treat that as empty.
export function readStorage(storage: Storage, key: string) {
  try {
    return storage.getItem(key)
  } catch {
    return null
  }
}

export function writeStorage(storage: Storage, key: string, value: string) {
  try {
    storage.setItem(key, value)
  } catch {
    // Ignore quota or access errors; the mock simply won't persist.
  }
}

export function removeStorage(storage: Storage, key: string) {
  try {
    storage.removeItem(key)
  } catch {
    // Ignore.
  }
}
