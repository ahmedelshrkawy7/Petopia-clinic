import { Suspense, useState } from "react"
import { ChevronRightIcon, MenuIcon, PanelLeftIcon } from "lucide-react"
import { Link, Outlet, useLocation } from "react-router"
import { cn } from "cn"

import { AppSidebar } from "@/components/admin/app-sidebar"
import { FullPageLoader } from "@/components/admin/full-page-loader"
import { UserMenu } from "@/components/admin/user-menu"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { readStorage, writeStorage } from "@/services/mock-utils"

const COLLAPSED_KEY = "petopia:sidebar-collapsed"

function useBreadcrumbs() {
  const { pathname } = useLocation()
  const crumbs: { label: string; to?: string }[] = []
  if (pathname === "/admin" || pathname === "/admin/") {
    crumbs.push({ label: "Overview" })
  } else if (pathname.startsWith("/admin/bookings")) {
    const isDetail = pathname.replace(/\/$/, "") !== "/admin/bookings"
    crumbs.push({ label: "Bookings", to: isDetail ? "/admin/bookings" : undefined })
    if (isDetail) crumbs.push({ label: "Booking details" })
  }
  return crumbs
}

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(
    () => readStorage(localStorage, COLLAPSED_KEY) === "1"
  )
  const [mobileOpen, setMobileOpen] = useState(false)
  const crumbs = useBreadcrumbs()

  const toggleCollapsed = () => {
    setCollapsed((value) => {
      writeStorage(localStorage, COLLAPSED_KEY, value ? "0" : "1")
      return !value
    })
  }

  return (
    <div className="flex min-h-svh bg-section font-jakarta">
      <aside
        className={cn(
          "sticky top-0 hidden h-svh shrink-0 border-r border-border bg-card transition-[width] duration-200 lg:block",
          collapsed ? "w-[72px]" : "w-64"
        )}
      >
        <AppSidebar collapsed={collapsed} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border bg-background/85 px-4 backdrop-blur sm:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-lg"
                  className="lg:hidden"
                  aria-label="Open navigation"
                />
              }
            >
              <MenuIcon />
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <AppSidebar onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
          <Button
            variant="ghost"
            size="icon-lg"
            className="hidden lg:inline-flex"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-pressed={collapsed}
          >
            <PanelLeftIcon />
          </Button>

          <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
            <ol className="flex items-center gap-1.5 text-sm">
              {crumbs.map((crumb, i) => (
                <li key={crumb.label} className="flex min-w-0 items-center gap-1.5">
                  {i > 0 && (
                    <ChevronRightIcon
                      aria-hidden
                      className="size-3.5 shrink-0 text-muted-foreground"
                    />
                  )}
                  {crumb.to ? (
                    <Link
                      to={crumb.to}
                      className="truncate text-muted-foreground hover:text-foreground"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span
                      aria-current="page"
                      className="truncate font-semibold text-foreground"
                    >
                      {crumb.label}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>

          <ThemeToggle />
          <UserMenu />
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:py-8">
          <Suspense fallback={<FullPageLoader inline />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
