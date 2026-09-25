import { useState } from "react"
import { MenuIcon } from "lucide-react"
import { cn } from "cn"

import { MaskIcon } from "@/components/mask-icon"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import calendarIcon from "@/assets/icons/calendar.svg"
import petopiaMark from "@/assets/brand/petopia-mark.png"
import phoneIcon from "@/assets/icons/phone.svg"

type NavLink = { label: string; href: string }

const defaultLinks: NavLink[] = [
  { label: "Home", href: "#home" },
  { label: "Services", href: "#services" },
  { label: "Why Petopia", href: "#why-petopia" },
  { label: "Reviews", href: "#reviews" },
  { label: "Contact", href: "#contact" },
]

type NavbarProps = {
  links?: NavLink[]
  defaultActiveHref?: string
  phone?: string
  onBook?: () => void
  className?: string
}

function Brand() {
  return (
    <a href="#home" className="flex items-center gap-2.5">
      <img src={petopiaMark} alt="" className="h-[42px] w-auto shrink-0" />
      <span className="flex flex-col gap-px leading-normal whitespace-nowrap">
        <span className="text-[19px] text-foreground">Petopia</span>
        <span className="text-[8px] font-semibold text-muted-foreground uppercase">
          Exceptional pet care
        </span>
      </span>
    </a>
  )
}

export function Navbar({
  links = defaultLinks,
  defaultActiveHref = links[0]?.href,
  phone = "(415) 908-PETS",
  onBook,
  className,
}: NavbarProps) {
  const [activeHref, setActiveHref] = useState(defaultActiveHref)
  const [menuOpen, setMenuOpen] = useState(false)

  const linkClass = (href: string) =>
    cn(
      "transition-colors hover:text-primary",
      href === activeHref ? "font-bold text-primary" : "font-medium text-body"
    )

  return (
    <header className={cn("w-full bg-background", className)}>
      <div className="page-container flex h-20 items-center justify-between">
        <Brand />

        <nav
          aria-label="Main"
          className="hidden items-center gap-[34px] text-[13px] whitespace-nowrap lg:flex"
        >
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              aria-current={link.href === activeHref ? "page" : undefined}
              onClick={() => setActiveHref(link.href)}
              className={linkClass(link.href)}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3 md:gap-[22px]">
          <a
            href={`tel:${phoneToDigits(phone)}`}
            className="hidden items-center gap-2 sm:flex"
          >
            <MaskIcon src={phoneIcon} className="size-[15px] text-primary" />
            <span className="flex flex-col gap-px leading-normal whitespace-nowrap">
              <span className="text-[8px] text-muted-foreground uppercase">
                Available 24/7
              </span>
              <span className="text-[11px] font-bold text-foreground">
                {phone}
              </span>
            </span>
          </a>

          <ThemeToggle className="rounded-full" />

          <Button
            onClick={onBook}
            className="h-12 gap-[9px] rounded-full px-[22px] text-[13px] font-bold"
          >
            <MaskIcon src={calendarIcon} className="size-4" />
            Book
          </Button>

          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-lg"
                  className="lg:hidden"
                  aria-label="Open menu"
                />
              }
            >
              <MenuIcon />
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <Brand />
              </SheetHeader>
              <nav aria-label="Mobile" className="flex flex-col gap-1 px-4">
                {links.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    aria-current={link.href === activeHref ? "page" : undefined}
                    onClick={() => {
                      setActiveHref(link.href)
                      setMenuOpen(false)
                    }}
                    className={cn(
                      "rounded-lg px-3 py-2.5 text-sm hover:bg-muted",
                      linkClass(link.href)
                    )}
                  >
                    {link.label}
                  </a>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}

// Converts vanity numbers like "(415) 908-PETS" into dialable digits.
function phoneToDigits(phone: string) {
  const keypad = "22233344455566677778889999"
  return phone
    .toUpperCase()
    .replace(/[A-Z]/g, (c) => keypad[c.charCodeAt(0) - 65])
    .replace(/[^\d+]/g, "")
}
