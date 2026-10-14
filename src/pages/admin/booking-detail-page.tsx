import { useState, type ReactNode } from "react"
import {
  ArrowLeftIcon,
  CalendarIcon,
  CheckIcon,
  Loader2Icon,
  PawPrintIcon,
  PhoneIcon,
  SearchXIcon,
  Trash2Icon,
  UserIcon,
} from "lucide-react"
import { Link, useNavigate, useParams } from "react-router"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { EmptyState, ErrorState } from "@/components/admin/page-states"
import { StatusBadge } from "@/components/admin/status-badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { useBooking } from "@/hooks/use-bookings"
import { useDocumentTitle } from "@/hooks/use-document-title"
import {
  formatDay,
  formatSlot,
  formatTimestamp,
  PET_LABELS,
  serviceLabel,
  specialistLabel,
  STATUS_LABELS,
  telHref,
} from "@/lib/booking-format"
import { bookingsService } from "@/services"
import { BOOKING_STATUSES, type Booking, type BookingStatus } from "@/types/booking"

const STATUS_ITEMS = BOOKING_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:justify-between sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground sm:text-right">{children}</dd>
    </div>
  )
}

function SectionCard({
  icon,
  title,
  children,
}: {
  icon: ReactNode
  title: string
  children: ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-brand-soft text-primary [&_svg]:size-4">
            {icon}
          </span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="divide-y divide-border">{children}</dl>
      </CardContent>
    </Card>
  )
}

type SaveState = "idle" | "saving" | "saved" | "error"

function NotesEditor({ booking }: { booking: Booking }) {
  const [notes, setNotes] = useState(booking.notes)
  const [state, setState] = useState<SaveState>("idle")
  const [savedNotes, setSavedNotes] = useState(booking.notes)

  // Reflect changes made elsewhere (another tab) unless the user is editing.
  if (booking.notes !== savedNotes) {
    if (notes === savedNotes) setNotes(booking.notes)
    setSavedNotes(booking.notes)
  }

  const save = async () => {
    if (notes === savedNotes) return
    setState("saving")
    try {
      await bookingsService.updateNotes(booking.id, notes)
      setSavedNotes(notes)
      setState("saved")
    } catch (err) {
      setState("error")
      toast.error(err instanceof Error ? err.message : "Couldn't save notes")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Internal notes</CardTitle>
        <CardDescription>Only visible to staff. Saved when you leave the field.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Textarea
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value)
            setState("idle")
          }}
          onBlur={save}
          rows={5}
          maxLength={2000}
          placeholder="e.g. Called to confirm, owner prefers morning visits…"
          aria-label="Internal notes"
        />
        <p aria-live="polite" className="flex h-4 items-center gap-1.5 text-xs text-muted-foreground">
          {state === "saving" && (
            <>
              <Loader2Icon className="size-3 animate-spin" /> Saving…
            </>
          )}
          {state === "saved" && (
            <>
              <CheckIcon className="size-3" /> Saved
            </>
          )}
          {state === "error" && (
            <button type="button" onClick={save} className="text-destructive underline">
              Save failed. Retry
            </button>
          )}
        </p>
      </CardContent>
    </Card>
  )
}

export default function BookingDetailPage() {
  const { id = "" } = useParams()
  const navigate = useNavigate()
  const { data: booking, error, loading, refetch } = useBooking(id)
  const [updating, setUpdating] = useState(false)
  const [confirm, setConfirm] = useState<"cancel" | "delete" | null>(null)

  useDocumentTitle(booking ? `${booking.fullName} · Bookings` : "Booking details")

  const changeStatus = async (status: BookingStatus) => {
    setUpdating(true)
    try {
      await bookingsService.updateStatus([id], status)
      toast.success(`Status changed to ${STATUS_LABELS[status].toLowerCase()}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update status")
    } finally {
      setUpdating(false)
    }
  }

  const backLink = (
    <Link
      to="/admin/bookings"
      className={buttonVariants({ variant: "ghost", className: "-ml-2.5 mb-4" })}
    >
      <ArrowLeftIcon />
      All bookings
    </Link>
  )

  if (error) {
    return (
      <>
        {backLink}
        <Card>
          <ErrorState message={error.message} onRetry={refetch} />
        </Card>
      </>
    )
  }

  if (loading && booking === undefined) {
    return (
      <>
        {backLink}
        <Skeleton className="mb-6 h-10 w-72" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </>
    )
  }

  if (!booking) {
    return (
      <>
        {backLink}
        <Card>
          <EmptyState
            icon={<SearchXIcon />}
            title="Booking not found"
            description="It may have been deleted, or the link is incorrect."
          />
        </Card>
      </>
    )
  }

  return (
    <>
      {backLink}

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground sm:text-[28px]">
              {booking.fullName}
            </h1>
            <StatusBadge status={booking.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {serviceLabel(booking.service)} · {formatDay(booking.date)} at{" "}
            {formatSlot(booking.time)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={telHref(booking.phone)} className={buttonVariants({ variant: "outline", size: "lg" })}>
            <PhoneIcon />
            Call
          </a>
          <Button variant="destructive" size="lg" onClick={() => setConfirm("delete")}>
            <Trash2Icon />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <SectionCard icon={<CalendarIcon />} title="Appointment">
            <DetailRow label="Date">{formatDay(booking.date)}</DetailRow>
            <DetailRow label="Time">{formatSlot(booking.time)}</DetailRow>
            <DetailRow label="Service">{serviceLabel(booking.service)}</DetailRow>
            <DetailRow label="Specialist">{specialistLabel(booking.specialist)}</DetailRow>
          </SectionCard>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <SectionCard icon={<UserIcon />} title="Customer">
              <DetailRow label="Name">{booking.fullName}</DetailRow>
              <DetailRow label="Phone">
                <a href={telHref(booking.phone)} className="text-primary hover:underline">
                  {booking.phone}
                </a>
              </DetailRow>
            </SectionCard>
            <SectionCard icon={<PawPrintIcon />} title="Pet">
              <DetailRow label="Type">{PET_LABELS[booking.petType]}</DetailRow>
              <DetailRow label="Name & age">{booking.petInfo}</DetailRow>
            </SectionCard>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
              <CardDescription>Update as the appointment progresses.</CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                items={STATUS_ITEMS}
                value={booking.status}
                disabled={updating}
                onValueChange={(status) => {
                  if (!status || status === booking.status) return
                  if (status === "cancelled") setConfirm("cancel")
                  else changeStatus(status)
                }}
              >
                <SelectTrigger aria-label="Booking status" className="h-10! w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_ITEMS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <NotesEditor booking={booking} />

          <Card size="sm">
            <CardContent>
              <dl className="divide-y divide-border">
                <DetailRow label="Received">{formatTimestamp(booking.createdAt)}</DetailRow>
                <DetailRow label="Last updated">{formatTimestamp(booking.updatedAt)}</DetailRow>
                <DetailRow label="Reference">
                  <span className="font-mono text-xs">{booking.id.slice(0, 8)}</span>
                </DetailRow>
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirm === "cancel"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Cancel this booking?"
        description="The appointment slot will be freed up. You can change the status again later."
        confirmLabel="Cancel booking"
        destructive
        onConfirm={() => changeStatus("cancelled")}
      />
      <ConfirmDialog
        open={confirm === "delete"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Delete this booking?"
        description="This permanently removes the booking and its notes. This can't be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          try {
            await bookingsService.remove([id])
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Couldn't delete booking")
            throw err
          }
          toast.success("Booking deleted")
          navigate("/admin/bookings", { replace: true })
        }}
      />
    </>
  )
}
