import { format } from "date-fns"
import {
  CalendarClockIcon,
  CalendarDaysIcon,
  CircleCheckBigIcon,
  HourglassIcon,
  InboxIcon,
} from "lucide-react"
import { Link } from "react-router"

import { BookingsChart } from "@/components/admin/bookings-chart"
import { ErrorState, EmptyState, PageHeader } from "@/components/admin/page-states"
import { StatCard } from "@/components/admin/stat-card"
import { StatusBadge } from "@/components/admin/status-badge"
import { TodaySchedule } from "@/components/admin/today-schedule"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  useBookingStats,
  useRecentBookings,
  useTodayBookings,
} from "@/hooks/use-bookings"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { formatDay, formatSlot, serviceLabel } from "@/lib/booking-format"

function CardSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  )
}

export default function OverviewPage() {
  useDocumentTitle("Overview")
  const todayKey = format(new Date(), "yyyy-MM-dd")
  const stats = useBookingStats()
  const today = useTodayBookings(todayKey)
  const recent = useRecentBookings(5)

  return (
    <>
      <PageHeader
        title="Overview"
        description={format(new Date(), "EEEE, MMMM d, yyyy")}
        actions={
          <Link to="/admin/bookings" className={buttonVariants({ size: "lg" })}>
            View all bookings
          </Link>
        }
      />

      {stats.error ? (
        <Card className="mb-6">
          <ErrorState message={stats.error.message} onRetry={stats.refetch} />
        </Card>
      ) : (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Today"
            value={stats.data?.today}
            hint="Appointments scheduled today"
            icon={CalendarDaysIcon}
          />
          <StatCard
            label="Upcoming"
            value={stats.data?.upcomingWeek}
            hint="In the next 7 days"
            icon={CalendarClockIcon}
          />
          <StatCard
            label="Pending"
            value={stats.data?.pending}
            hint="Waiting for confirmation"
            icon={HourglassIcon}
          />
          <StatCard
            label="Completed"
            value={stats.data?.completedThisMonth}
            hint={`Visits in ${format(new Date(), "MMMM")}`}
            icon={CircleCheckBigIcon}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Today's schedule</CardTitle>
            <CardDescription>Booked and free time slots</CardDescription>
            <CardAction>
              <Link
                to={`/admin/bookings?from=${todayKey}&to=${todayKey}&sort=date-asc`}
                className={buttonVariants({ variant: "outline" })}
              >
                Open list
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent>
            {today.error ? (
              <ErrorState message={today.error.message} onRetry={today.refetch} />
            ) : today.data ? (
              <TodaySchedule bookings={today.data} />
            ) : (
              <CardSkeleton rows={5} />
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>New bookings</CardTitle>
              <CardDescription>Received per day</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.data ? (
                <BookingsChart data={stats.data.perDay} />
              ) : stats.error ? null : (
                <Skeleton className="h-48 w-full" />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent bookings</CardTitle>
              <CardDescription>Latest requests from the website</CardDescription>
            </CardHeader>
            <CardContent>
              {recent.error ? (
                <ErrorState message={recent.error.message} onRetry={recent.refetch} />
              ) : !recent.data ? (
                <CardSkeleton />
              ) : recent.data.items.length === 0 ? (
                <EmptyState
                  icon={<InboxIcon />}
                  title="No bookings yet"
                  description="New requests from the booking form will appear here."
                />
              ) : (
                <ul className="flex flex-col">
                  {recent.data.items.map((b) => (
                    <li key={b.id} className="border-b border-border last:border-0">
                      <Link
                        to={`/admin/bookings/${b.id}`}
                        className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-foreground">
                            {b.fullName}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {serviceLabel(b.service)} ·{" "}
                            {formatDay(b.date, "MMM d")}, {formatSlot(b.time)}
                          </span>
                        </span>
                        <StatusBadge status={b.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
