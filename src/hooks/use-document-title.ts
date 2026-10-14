import { useEffect } from "react"

/** Sets the tab title while the page is mounted, restoring the previous one after. */
export function useDocumentTitle(title: string | undefined) {
  useEffect(() => {
    if (!title) return
    const previous = document.title
    document.title = `${title} · Petopia Admin`
    return () => {
      document.title = previous
    }
  }, [title])
}
