import { useEffect, useState } from "react"
import { format, parseISO } from "date-fns"
import {
  CalendarIcon,
  ChevronDownIcon,
  SearchIcon,
  XIcon,
} from "lucide-react"
import type { DateRange } from "react-day-picker"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PET_TYPES, SERVICES } from "@/lib/booking-schema"
import { PET_LABELS, STATUS_LABELS } from "@/lib/booking-format"
import {
  BOOKING_STATUSES,
  type BookingListQuery,
  type BookingSort,
} from "@/types/booking"

const SORT_OPTIONS: { value: BookingSort; label: string }[] = [
  { value: "date-desc", label: "Appointment: latest first" },
  { value: "date-asc", label: "Appointment: earliest first" },
  { value: "created-desc", label: "Received: newest first" },
  { value: "created-asc", label: "Received: oldest first" },
]

type FilterMenuProps<T extends string> = {
  label: string
  options: { value: T; label: string }[]
  selected: T[] | undefined
  onChange: (values: T[] | undefined) => void
}

function FilterMenu<T extends string>({
  label,
  options,
  selected = [],
  onChange,
}: FilterMenuProps<T>) {
  const toggle = (value: T, checked: boolean) => {
    const next = checked
      ? [...selected, value]
      : selected.filter((v) => v !== value)
    onChange(next.length ? next : undefined)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="lg"
            className={cn(selected.length && "border-primary/50 text-primary")}
          />
        }
      >
        {label}
        {selected.length > 0 && (
          <span className="rounded-full bg-primary px-1.5 text-[10px] leading-4 font-bold text-primary-foreground">
            {selected.length}
          </span>
        )}
        <ChevronDownIcon className="text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Filter by {label.toLowerCase()}</DropdownMenuLabel>
          {options.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={selected.includes(option.value)}
              onCheckedChange={(checked) => toggle(option.value, checked)}
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function DateRangeFilter({
  from,
  to,
  onChange,
}: {
  from?: string
  to?: string
  onChange: (range: { from?: string; to?: string }) => void
}) {
  const selected: DateRange | undefined = from
    ? { from: parseISO(from), to: to ? parseISO(to) : undefined }
    : undefined
  const label = from
    ? `${format(parseISO(from), "MMM d")}${to && to !== from ? ` – ${format(parseISO(to), "MMM d")}` : ""}`
    : "Any date"

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="lg"
            className={cn(from && "border-primary/50 text-primary")}
          />
        }
      >
        <CalendarIcon />
        {label}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="range"
          selected={selected}
          onSelect={(range) =>
            onChange({
              from: range?.from ? format(range.from, "yyyy-MM-dd") : undefined,
              to: range?.to ? format(range.to, "yyyy-MM-dd") : undefined,
            })
          }
          numberOfMonths={1}
        />
        {from && (
          <div className="border-t border-border p-2">
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => onChange({ from: undefined, to: undefined })}
            >
              Clear dates
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

type BookingsToolbarProps = {
  query: BookingListQuery
  onChange: (patch: Partial<BookingListQuery>) => void
  onReset: () => void
  hasFilters: boolean
}

export function BookingsToolbar({
  query,
  onChange,
  onReset,
  hasFilters,
}: BookingsToolbarProps) {
  const [search, setSearch] = useState(query.search ?? "")

  // Pick up external changes (Reset, back/forward navigation).
  const [lastQuerySearch, setLastQuerySearch] = useState(query.search)
  if (query.search !== lastQuerySearch) {
    setLastQuerySearch(query.search)
    // Don't clobber a trailing space the user is still typing.
    if (search.trim() !== (query.search ?? "")) setSearch(query.search ?? "")
  }

  // Debounce typing so every keystroke doesn't trigger a request.
  useEffect(() => {
    if ((query.search ?? "") === search.trim()) return
    const timer = setTimeout(() => onChange({ search }), 300)
    return () => clearTimeout(timer)
  }, [search, query.search, onChange])

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <SearchIcon
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone or pet"
            aria-label="Search bookings"
            className="h-9 pl-8"
          />
        </div>
        <FilterMenu
          label="Status"
          options={BOOKING_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
          selected={query.status}
          onChange={(status) => onChange({ status })}
        />
        <FilterMenu
          label="Service"
          options={SERVICES.map((s) => ({ value: s.value, label: s.label }))}
          selected={query.service}
          onChange={(service) => onChange({ service })}
        />
        <FilterMenu
          label="Pet"
          options={PET_TYPES.map((p) => ({ value: p, label: PET_LABELS[p] }))}
          selected={query.petType}
          onChange={(petType) => onChange({ petType })}
        />
        <DateRangeFilter
          from={query.from}
          to={query.to}
          onChange={(range) => onChange(range)}
        />
        {hasFilters && (
          <Button variant="ghost" size="lg" onClick={onReset}>
            <XIcon />
            Reset
          </Button>
        )}
      </div>

      <Select
        items={SORT_OPTIONS}
        value={query.sort ?? "date-desc"}
        onValueChange={(sort) => sort && onChange({ sort: sort as BookingSort })}
      >
        <SelectTrigger aria-label="Sort bookings" className="h-9! w-full sm:w-60">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
