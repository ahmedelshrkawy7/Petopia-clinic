import { useMemo } from "react"
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
} from "@tanstack/react-table"
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  CalendarCheck2Icon,
  CheckCheckIcon,
  EyeIcon,
  MoreHorizontalIcon,
  Trash2Icon,
  XCircleIcon,
} from "lucide-react"
import { Link, useNavigate } from "react-router"
import { cn } from "cn"

import { StatusBadge } from "@/components/admin/status-badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  formatDay,
  formatSlot,
  formatTimestamp,
  PET_LABELS,
  serviceLabel,
  specialistLabel,
} from "@/lib/booking-format"
import type { Booking, BookingSort, BookingStatus } from "@/types/booking"

export type RowAction =
  | { type: "status"; status: BookingStatus }
  | { type: "delete" }

type BookingsTableProps = {
  bookings: Booking[]
  sort: BookingSort
  onSortChange: (sort: BookingSort) => void
  rowSelection: RowSelectionState
  onRowSelectionChange: (selection: RowSelectionState) => void
  onAction: (booking: Booking, action: RowAction) => void
  loading?: boolean
}

function SortHeader({
  label,
  field,
  sort,
  onSortChange,
}: {
  label: string
  field: "date" | "created"
  sort: BookingSort
  onSortChange: (sort: BookingSort) => void
}) {
  const active = sort.startsWith(field)
  const desc = sort.endsWith("desc")
  const Icon = !active ? ArrowUpDownIcon : desc ? ArrowDownIcon : ArrowUpIcon
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-2 font-semibold text-muted-foreground"
      onClick={() =>
        onSortChange(`${field}-${active && desc ? "asc" : "desc"}` as BookingSort)
      }
    >
      {label}
      <Icon className={cn(!active && "opacity-50")} />
    </Button>
  )
}

export function BookingsTable({
  bookings,
  sort,
  onSortChange,
  rowSelection,
  onRowSelectionChange,
  onAction,
  loading,
}: BookingsTableProps) {
  const navigate = useNavigate()

  const columns = useMemo<ColumnDef<Booking>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            aria-label="Select all on this page"
            checked={table.getIsAllPageRowsSelected()}
            indeterminate={table.getIsSomePageRowsSelected()}
            onCheckedChange={(checked) => table.toggleAllPageRowsSelected(!!checked)}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            aria-label={`Select booking for ${row.original.fullName}`}
            checked={row.getIsSelected()}
            onCheckedChange={(checked) => row.toggleSelected(!!checked)}
          />
        ),
      },
      {
        id: "customer",
        header: "Customer",
        cell: ({ row: { original: b } }) => (
          <div className="min-w-36">
            <Link
              to={`/admin/bookings/${b.id}`}
              className="font-semibold text-foreground outline-none hover:text-primary hover:underline focus-visible:underline"
            >
              {b.fullName}
            </Link>
            <div className="text-xs text-muted-foreground tabular-nums">{b.phone}</div>
          </div>
        ),
      },
      {
        id: "pet",
        header: "Pet",
        cell: ({ row: { original: b } }) => (
          <div className="min-w-28">
            <div className="text-foreground">{b.petInfo}</div>
            <div className="text-xs text-muted-foreground">{PET_LABELS[b.petType]}</div>
          </div>
        ),
      },
      {
        id: "service",
        header: "Service",
        cell: ({ row: { original: b } }) => (
          <div className="min-w-40">
            <div className="text-foreground">{serviceLabel(b.service)}</div>
            <div className="text-xs text-muted-foreground">
              {specialistLabel(b.specialist)}
            </div>
          </div>
        ),
      },
      {
        id: "appointment",
        header: () => (
          <SortHeader label="Appointment" field="date" sort={sort} onSortChange={onSortChange} />
        ),
        cell: ({ row: { original: b } }) => (
          <div className="min-w-32">
            <div className="text-foreground">{formatDay(b.date, "EEE, MMM d")}</div>
            <div className="text-xs text-muted-foreground">{formatSlot(b.time)}</div>
          </div>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "created",
        header: () => (
          <SortHeader label="Received" field="created" sort={sort} onSortChange={onSortChange} />
        ),
        cell: ({ row }) => (
          <span className="text-xs whitespace-nowrap text-muted-foreground">
            {formatTimestamp(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row: { original: b } }) => (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Actions for ${b.fullName}`}
                />
              }
            >
              <MoreHorizontalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => navigate(`/admin/bookings/${b.id}`)}>
                <EyeIcon />
                View details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={b.status === "confirmed"}
                onClick={() => onAction(b, { type: "status", status: "confirmed" })}
              >
                <CalendarCheck2Icon />
                Confirm
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={b.status === "completed"}
                onClick={() => onAction(b, { type: "status", status: "completed" })}
              >
                <CheckCheckIcon />
                Mark completed
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={b.status === "cancelled"}
                onClick={() => onAction(b, { type: "status", status: "cancelled" })}
              >
                <XCircleIcon />
                Cancel booking
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onAction(b, { type: "delete" })}
              >
                <Trash2Icon />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [sort, onSortChange, onAction, navigate]
  )

  // TanStack Table returns non-memoizable functions; that's expected here.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: bookings,
    columns,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    state: { rowSelection },
    onRowSelectionChange: (updater) =>
      onRowSelectionChange(
        typeof updater === "function" ? updater(rowSelection) : updater
      ),
  })

  return (
    <Table aria-busy={loading} className={cn(loading && "opacity-60 transition-opacity")}>
      <TableHeader>
        {table.getHeaderGroups().map((group) => (
          <TableRow key={group.id} className="hover:bg-transparent">
            {group.headers.map((header) => (
              <TableHead
                key={header.id}
                className={cn(
                  "h-11 text-xs font-semibold text-muted-foreground",
                  header.id === "select" && "w-10",
                  header.id === "actions" && "w-12"
                )}
              >
                {header.isPlaceholder
                  ? null
                  : flexRender(header.column.columnDef.header, header.getContext())}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.id} data-state={row.getIsSelected() ? "selected" : undefined}>
            {row.getVisibleCells().map((cell) => (
              <TableCell key={cell.id} className="py-3">
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
