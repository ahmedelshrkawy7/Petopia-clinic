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
    // Ignore quota or access errors; the preference simply won't persist.
  }
}
