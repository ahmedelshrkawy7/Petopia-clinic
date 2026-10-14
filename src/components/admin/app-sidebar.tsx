import {
  CalendarCheckIcon,
  ExternalLinkIcon,
  LayoutDashboardIcon,
  type LucideIcon,
} from "lucide-react"
import { NavLink } from "react-router"
import { cn } from "cn"

import petopiaMark from "@/assets/brand/petopia-mark.png"

type NavItem = { label: string; to: string; icon: LucideIcon; end?: boolean }

const NAV_ITEMS: NavItem[] = [
  { label: "Overview", to: "/admin", icon: LayoutDashboardIcon, end: true },
  { label: "Bookings", to: "/admin/bookings", icon: CalendarCheckIcon },
]

type AppSidebarProps = {
  collapsed?: boolean
  onNavigate?: () => void
  className?: string
}

export function AppSidebar({ collapsed, onNavigate, className }: AppSidebarProps) {
  const itemClass = (active: boolean) =>
    cn(
      "flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
      collapsed && "justify-center px-0",
      active
        ? "bg-brand-soft text-primary"
        : "text-body hover:bg-muted hover:text-foreground"
    )

  return (
    <div className={cn("flex h-full flex-col gap-6 p-3 font-jakarta", className)}>
      <NavLink
        to="/admin"
        onClick={onNavigate}
        className={cn(
          "flex h-12 items-center gap-2.5 px-2",
          collapsed && "justify-center px-0"
        )}
      >
        <img src={petopiaMark} alt="" className="h-9 w-auto shrink-0" />
        {!collapsed && (
          <span className="flex flex-col leading-tight">
            <span className="font-heading text-lg font-extrabold text-foreground">
              Petopia
            </span>
            <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              Admin
            </span>
          </span>
        )}
        {collapsed && <span className="sr-only">Petopia admin</span>}
      </NavLink>

      <nav aria-label="Dashboard" className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map(({ label, to, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            title={collapsed ? label : undefined}
            className={({ isActive }) => itemClass(isActive)}
          >
            <Icon className="size-[18px] shrink-0" />
            <span className={cn(collapsed && "sr-only")}>{label}</span>
          </NavLink>
        ))}
      </nav>

      <a
        href="/"
        target="_blank"
        rel="noreferrer"
        title={collapsed ? "View website" : undefined}
        className={itemClass(false)}
      >
        <ExternalLinkIcon className="size-[18px] shrink-0" />
        <span className={cn(collapsed && "sr-only")}>View website</span>
      </a>
    </div>
  )
}
