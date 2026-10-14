import type { LucideIcon } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"

type StatCardProps = {
  label: string
  value: number | undefined
  hint: string
  icon: LucideIcon
  loading?: boolean
}

export function StatCard({ label, value, hint, icon: Icon, loading }: StatCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-body">{label}</p>
        <span className="flex size-9 items-center justify-center rounded-xl bg-brand-soft text-primary">
          <Icon className="size-[18px]" />
        </span>
      </div>
      {loading || value === undefined ? (
        <Skeleton className="h-9 w-16" />
      ) : (
        <p className="font-heading text-3xl font-extrabold tracking-tight text-foreground tabular-nums">
          {value}
        </p>
      )}
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}
