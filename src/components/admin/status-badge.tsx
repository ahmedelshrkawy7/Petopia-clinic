import { cn } from "cn"

import { Badge } from "@/components/ui/badge"
import { STATUS_LABELS } from "@/lib/booking-format"
import type { BookingStatus } from "@/types/booking"

const STATUS_STYLES: Record<BookingStatus, string> = {
  pending:
    "bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300",
  confirmed: "bg-brand-soft text-primary",
  completed:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300",
  cancelled: "bg-muted text-muted-foreground",
}

export function StatusBadge({
  status,
  className,
}: {
  status: BookingStatus
  className?: string
}) {
  return (
    <Badge className={cn(STATUS_STYLES[status], className)}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {STATUS_LABELS[status]}
    </Badge>
  )
}
