import { Loader2Icon } from "lucide-react"
import { cn } from "cn"

/** Centered spinner; `inline` fills the content area instead of the viewport. */
export function FullPageLoader({ inline }: { inline?: boolean }) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-center justify-center text-muted-foreground",
        inline ? "min-h-[50vh]" : "min-h-svh bg-background"
      )}
    >
      <Loader2Icon className="size-6 animate-spin" />
      <span className="sr-only">Loading…</span>
    </div>
  )
}
