import { useCallback, useEffect, useState } from "react"
import type { RowSelectionState } from "@tanstack/react-table"
import { format } from "date-fns"
import {
  CalendarCheck2Icon,
  CheckCheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  InboxIcon,
  Loader2Icon,
  SearchXIcon,
  Trash2Icon,
  XCircleIcon,
} from "lucide-react"
import { toast } from "sonner"

import { BookingsTable, type RowAction } from "@/components/admin/bookings-table"
import { BookingsToolbar } from "@/components/admin/bookings-toolbar"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { EmptyState, ErrorState, PageHeader } from "@/components/admin/page-states"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { PAGE_SIZES, useBookingQueryParams } from "@/hooks/use-booking-query-params"
import { useBookingList } from "@/hooks/use-bookings"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { bookingsToCsv, downloadFile, STATUS_LABELS } from "@/lib/booking-format"
import { bookingsService } from "@/services"
import type { Booking, BookingStatus } from "@/types/booking"

type PendingConfirm =
  | { kind: "cancel"; ids: string[] }
  | { kind: "delete"; ids: string[] }
  | null

const errorMessage = (err: unknown) =>
  err instanceof Error ? err.message : "Something went wrong"

export default function BookingsPage() {
  useDocumentTitle("Bookings")
  const { query, update, reset, hasFilters } = useBookingQueryParams()
  const list = useBookingList(query)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm>(null)
  const [exporting, setExporting] = useState(false)

  const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id])
  const total = list.data?.total ?? 0
  const page = query.page ?? 1
  const pageSize = query.pageSize ?? 10
  const pageCount = Math.max(1, Math.ceil(total / pageSize))

  // Deleting the last rows of the final page would leave it empty; step back.
  useEffect(() => {
    if (list.data && !list.loading && total > 0 && page > pageCount) {
      update({ page: pageCount })
    }
  }, [list.data, list.loading, total, page, pageCount, update])

  // Clear the selection whenever the visible result set changes.
  const changeQuery = useCallback(
    (patch: Parameters<typeof update>[0]) => {
      setRowSelection({})
      update(patch)
    },
    [update]
  )

  const setStatus = useCallback(async (ids: string[], status: BookingStatus) => {
    try {
      await bookingsService.updateStatus(ids, status)
      setRowSelection({})
      toast.success(
        ids.length === 1
          ? `Booking marked as ${STATUS_LABELS[status].toLowerCase()}`
          : `${ids.length} bookings marked as ${STATUS_LABELS[status].toLowerCase()}`
      )
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }, [])

  const remove = async (ids: string[]) => {
    try {
      await bookingsService.remove(ids)
      setRowSelection({})
      toast.success(ids.length === 1 ? "Booking deleted" : `${ids.length} bookings deleted`)
    } catch (err) {
      toast.error(errorMessage(err))
      throw err // keep the dialog open
    }
  }

  const handleAction = useCallback(
    (booking: Booking, action: RowAction) => {
      if (action.type === "delete") setPendingConfirm({ kind: "delete", ids: [booking.id] })
      else if (action.status === "cancelled")
        setPendingConfirm({ kind: "cancel", ids: [booking.id] })
      else setStatus([booking.id], action.status)
    },
    [setStatus]
  )

  const exportCsv = async () => {
    setExporting(true)
    try {
      const all = selectedIds.length
        ? (await bookingsService.listAll(query)).filter((b) => selectedIds.includes(b.id))
        : await bookingsService.listAll(query)
      downloadFile(
        `petopia-bookings-${format(new Date(), "yyyy-MM-dd")}.csv`,
        bookingsToCsv(all),
        "text/csv;charset=utf-8"
      )
      toast.success(`Exported ${all.length} booking${all.length === 1 ? "" : "s"}`)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setExporting(false)
    }
  }

  const items = list.data?.items ?? []
  const firstLoad = list.loading && !list.data

  return (
    <>
      <PageHeader
        title="Bookings"
        description="Appointment requests submitted from the website"
        actions={
          <Button variant="outline" size="lg" onClick={exportCsv} disabled={exporting || total === 0}>
            {exporting ? <Loader2Icon className="animate-spin" /> : <DownloadIcon />}
            {selectedIds.length ? `Export ${selectedIds.length} selected` : "Export CSV"}
          </Button>
        }
      />

      <Card className="gap-0 py-0">
        <div className="border-b border-border p-4">
          <BookingsToolbar
            query={query}
            onChange={changeQuery}
            onReset={() => {
              setRowSelection({})
              reset()
            }}
            hasFilters={hasFilters}
          />
        </div>

        {selectedIds.length > 0 && (
          <div
            role="region"
            aria-label="Bulk actions"
            className="flex flex-wrap items-center gap-2 border-b border-border bg-brand-soft/50 px-4 py-2.5"
          >
            <span className="mr-2 text-sm font-semibold text-foreground">
              {selectedIds.length} selected
            </span>
            <Button variant="outline" onClick={() => setStatus(selectedIds, "confirmed")}>
              <CalendarCheck2Icon />
              Confirm
            </Button>
            <Button variant="outline" onClick={() => setStatus(selectedIds, "completed")}>
              <CheckCheckIcon />
              Complete
            </Button>
            <Button
              variant="outline"
              onClick={() => setPendingConfirm({ kind: "cancel", ids: selectedIds })}
            >
              <XCircleIcon />
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => setPendingConfirm({ kind: "delete", ids: selectedIds })}
            >
              <Trash2Icon />
              Delete
            </Button>
            <Button variant="ghost" className="ml-auto" onClick={() => setRowSelection({})}>
              Clear selection
            </Button>
          </div>
        )}

        {list.error ? (
          <ErrorState message={list.error.message} onRetry={list.refetch} />
        ) : firstLoad ? (
          <div className="flex flex-col gap-2 p-4">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          hasFilters ? (
            <EmptyState
              icon={<SearchXIcon />}
              title="No matching bookings"
              description="Try a different search or clear the filters."
              action={
                <Button variant="outline" onClick={reset}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={<InboxIcon />}
              title="No bookings yet"
              description="When customers book from the website, their requests show up here."
            />
          )
        ) : (
          <BookingsTable
            bookings={items}
            sort={query.sort ?? "date-desc"}
            onSortChange={(sort) => changeQuery({ sort })}
            rowSelection={rowSelection}
            onRowSelectionChange={setRowSelection}
            onAction={handleAction}
            loading={list.loading}
          />
        )}

        {total > 0 && (
          <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground" aria-live="polite">
              Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of{" "}
              {total}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Rows</span>
              <Select
                items={PAGE_SIZES.map((size) => ({ value: size, label: String(size) }))}
                value={pageSize}
                onValueChange={(size) => size && changeQuery({ pageSize: size })}
              >
                <SelectTrigger aria-label="Rows per page" className="w-18">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZES.map((size) => (
                    <SelectItem key={size} value={size}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="px-2 text-muted-foreground tabular-nums">
                Page {page} of {pageCount}
              </span>
              <Button
                variant="outline"
                size="icon"
                aria-label="Previous page"
                disabled={page <= 1}
                onClick={() => {
                  setRowSelection({})
                  update({ page: page - 1 })
                }}
              >
                <ChevronLeftIcon />
              </Button>
              <Button
                variant="outline"
                size="icon"
                aria-label="Next page"
                disabled={page >= pageCount}
                onClick={() => {
                  setRowSelection({})
                  update({ page: page + 1 })
                }}
              >
                <ChevronRightIcon />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={pendingConfirm?.kind === "cancel"}
        onOpenChange={(open) => !open && setPendingConfirm(null)}
        title={
          pendingConfirm && pendingConfirm.ids.length > 1
            ? `Cancel ${pendingConfirm.ids.length} bookings?`
            : "Cancel this booking?"
        }
        description="The appointment slot will be freed up. You can change the status again later."
        confirmLabel="Cancel booking"
        destructive
        onConfirm={() => setStatus(pendingConfirm?.ids ?? [], "cancelled")}
      />
      <ConfirmDialog
        open={pendingConfirm?.kind === "delete"}
        onOpenChange={(open) => !open && setPendingConfirm(null)}
        title={
          pendingConfirm && pendingConfirm.ids.length > 1
            ? `Delete ${pendingConfirm.ids.length} bookings?`
            : "Delete this booking?"
        }
        description="This permanently removes the booking and its notes. This can't be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => remove(pendingConfirm?.ids ?? [])}
      />
    </>
  )
}
