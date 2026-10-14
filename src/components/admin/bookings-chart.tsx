import { useState } from "react"
import { format, parseISO } from "date-fns"

type BookingsChartProps = {
  data: { date: string; count: number }[]
}

/** Single-series bar chart of new bookings per day. */
export function BookingsChart({ data }: BookingsChartProps) {
  const [active, setActive] = useState<number | null>(null)
  const max = Math.max(1, ...data.map((d) => d.count))
  // Round the axis top up to a whole, even number so the gridline label is clean.
  const top = Math.max(2, Math.ceil(max / 2) * 2)
  const total = data.reduce((sum, d) => sum + d.count, 0)
  const activePoint = active === null ? null : data[active]

  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="flex items-baseline justify-between gap-2">
        <span className="text-sm text-muted-foreground">
          <span className="font-heading text-2xl font-extrabold text-foreground tabular-nums">
            {total}
          </span>{" "}
          new bookings
        </span>
        <span aria-live="polite" className="text-xs text-muted-foreground">
          {activePoint
            ? `${format(parseISO(activePoint.date), "EEE, MMM d")}: ${activePoint.count} booking${activePoint.count === 1 ? "" : "s"}`
            : "Last 14 days"}
        </span>
      </figcaption>

      <div className="relative h-40" aria-hidden>
        {/* Recessive gridlines: top and midpoint, baseline is the axis. */}
        {[1, 0.5].map((ratio) => (
          <div
            key={ratio}
            className="absolute inset-x-0 border-t border-dashed border-border"
            style={{ bottom: `${ratio * 100}%` }}
          >
            <span className="absolute -top-2 left-0 bg-card pr-1 text-[10px] leading-none text-muted-foreground tabular-nums">
              {top * ratio}
            </span>
          </div>
        ))}
        <div className="absolute inset-0 flex items-end gap-[2px] border-b border-border pl-6">
          {data.map((point, i) => (
            <div
              key={point.date}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              className="group flex h-full flex-1 items-end justify-center"
            >
              <span
                className="block w-full max-w-5 rounded-t-[4px] bg-primary transition-opacity group-hover:opacity-80 data-[dim=true]:opacity-40"
                data-dim={active !== null && active !== i}
                style={{
                  height: `${(point.count / top) * 100}%`,
                  minHeight: point.count ? 2 : 0,
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-between pl-6 text-[10px] text-muted-foreground" aria-hidden>
        <span>{data[0] && format(parseISO(data[0].date), "MMM d")}</span>
        <span>Today</span>
      </div>

      {/* Accessible table view of the same data. */}
      <table className="sr-only">
        <caption>New bookings per day, last 14 days</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Bookings</th>
          </tr>
        </thead>
        <tbody>
          {data.map((point) => (
            <tr key={point.date}>
              <td>{format(parseISO(point.date), "EEEE, MMMM d")}</td>
              <td>{point.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
