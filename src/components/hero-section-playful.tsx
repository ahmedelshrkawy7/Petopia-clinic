import { Fragment } from "react"
import { cn } from "cn"

import { MaskIcon } from "@/components/mask-icon"
import { Button } from "@/components/ui/button"
import heroDog from "@/assets/hero/hero-dog.png"
import petParent1 from "@/assets/hero/pet-parent-1.jpg"
import petParent2 from "@/assets/hero/pet-parent-2.jpg"
import petParent3 from "@/assets/hero/pet-parent-3.jpg"
import arrowRightIcon from "@/assets/icons/arrow-right.svg"
import asteriskIcon from "@/assets/icons/asterisk.svg"
import badgeCheckIcon from "@/assets/icons/badge-check.svg"
import pawFilledIcon from "@/assets/icons/paw-filled.svg"
import pawPrintIcon from "@/assets/icons/paw-print.svg"
import starIcon from "@/assets/icons/star.svg"
import underline from "@/assets/icons/underline.svg"

const petParents = [petParent1, petParent2, petParent3]

const species = ["Dogs", "Cats", "Rabbits", "Birds", "Reptiles", "Hamsters"]

// Scattered paw trail behind the copy: [top, left, rotation, size]
const pawTrail = [
  ["12%", "4%", "-20deg", "size-5"],
  ["22%", "10%", "15deg", "size-4"],
  ["70%", "2%", "-35deg", "size-6"],
  ["82%", "9%", "10deg", "size-4"],
] as const

const sticker =
  "absolute z-20 flex items-center gap-3 rounded-2xl border-2 border-foreground bg-card px-4 py-3 shadow-[4px_4px_0_0_var(--color-foreground)] motion-safe:animate-float"

function RotatingBadge({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex size-28 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl",
        className
      )}
    >
      <svg
        viewBox="0 0 100 100"
        aria-hidden
        className="absolute inset-0 size-full motion-safe:animate-[spin_18s_linear_infinite]"
      >
        <defs>
          <path
            id="hero-badge-circle"
            d="M50,50 m-37,0 a37,37 0 1,1 74,0 a37,37 0 1,1 -74,0"
          />
        </defs>
        <text className="fill-current text-[10.5px] font-bold tracking-[2.5px] uppercase">
          <textPath href="#hero-badge-circle">
            Fear-free • Loving care • 24/7 •
          </textPath>
        </text>
      </svg>
      <MaskIcon src={pawFilledIcon} className="size-8" />
    </div>
  )
}

export function HeroSectionPlayful({ className }: { className?: string }) {
  return (
    <section
      id="home"
      className={cn("relative overflow-x-clip font-jakarta", className)}
    >
      {/* Dotted grid, faded toward the edges */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(var(--color-primary)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)] [background-size:22px_22px] opacity-[0.12]"
      />
      {/* Oversized outlined wordmark */}
      <span
        aria-hidden
        className="pointer-events-none absolute top-6 right-0 left-0 text-center font-heading text-[22vw] leading-none font-extrabold tracking-tighter text-transparent opacity-[0.07] select-none [-webkit-text-stroke:2px_var(--color-primary)] lg:text-[16vw]"
      >
        PETOPIA
      </span>
      {pawTrail.map(([top, left, rotate, size]) => (
        <MaskIcon
          key={`${top}-${left}`}
          src={pawPrintIcon}
          className={cn("absolute hidden text-primary/25 lg:block", size)}
          style={{ top, left, rotate }}
        />
      ))}

      <div className="relative page-container grid items-center gap-16 pt-10 pb-16 lg:grid-cols-[1.05fr_1fr] lg:pt-16 lg:pb-20">
        {/* Copy & CTAs */}
        <div className="flex flex-col items-start gap-7">
          <span className="inline-flex -rotate-2 items-center gap-2 rounded-full bg-foreground px-4 py-1.5 text-xs font-bold tracking-wide text-background uppercase shadow-lg">
            <span className="relative flex size-2">
              <span className="absolute inset-0 rounded-full bg-emerald-400 motion-safe:animate-ping" />
              <span className="relative size-2 rounded-full bg-emerald-400" />
            </span>
            Now accepting new patients
          </span>

          <h1 className="font-heading text-[44px] leading-[1.02] font-extrabold tracking-[-1.5px] text-foreground sm:text-6xl lg:text-[68px] lg:tracking-[-2px]">
            Where every{" "}
            <span className="inline-flex translate-y-1 -rotate-3 items-center gap-2 rounded-2xl bg-brand-soft px-3 text-primary">
              <MaskIcon src={pawFilledIcon} className="size-[0.6em]" />
              pet
            </span>
            <br />
            feels{" "}
            <span className="relative inline-block italic">
              <span className="bg-gradient-to-r from-primary via-fuchsia-500 to-amber-400 bg-clip-text pr-1 text-transparent">
                at home.
              </span>
              <img
                src={underline}
                alt=""
                aria-hidden
                className="absolute -bottom-3 left-0 h-3 w-full"
              />
            </span>
          </h1>

          <p className="max-w-[540px] border-l-4 border-primary/30 pl-5 text-base leading-7 text-body sm:text-lg">
            Premium, fear-free veterinary medicine for dogs, cats and exotic
            pets. From urgent care to wellness checkups, our loving doctors
            treat your furry companions like family.
          </p>

          <div className="flex flex-wrap items-center gap-5 pt-1">
            <Button
              nativeButton={false}
              render={<a href="#contact" />}
              className="group h-auto gap-3 rounded-full border-2 border-foreground py-2 pr-2 pl-7 text-base font-bold shadow-[5px_5px_0_0_var(--color-foreground)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_var(--color-foreground)]"
            >
              Book a Visit
              <span className="flex size-10 items-center justify-center rounded-full bg-primary-foreground text-primary transition-transform group-hover:rotate-[-45deg]">
                <MaskIcon src={arrowRightIcon} className="size-4" />
              </span>
            </Button>
            <a
              href="#services"
              className="font-semibold text-foreground underline decoration-primary/40 decoration-2 underline-offset-8 transition-colors hover:decoration-primary"
            >
              Explore services
            </a>
          </div>

          <div className="flex items-center gap-4 rounded-2xl bg-card/70 p-3 pr-5 shadow-sm ring-1 ring-border backdrop-blur-sm">
            <div className="flex -space-x-3">
              {petParents.map((src, i) => (
                <img
                  key={src}
                  src={src}
                  alt="Pet parent"
                  className={cn(
                    "size-10 rounded-full object-cover ring-[3px] ring-card",
                    i % 2 ? "rotate-6" : "-rotate-6"
                  )}
                />
              ))}
            </div>
            <div className="text-xs">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }, (_, i) => (
                  <img key={i} src={starIcon} alt="" className="size-3" />
                ))}
                <span className="pl-1.5 text-sm font-extrabold text-foreground">
                  4.9
                </span>
              </div>
              <p className="font-medium text-body">
                Loved by <b className="text-foreground">5,000+</b> pet parents
              </p>
            </div>
          </div>
        </div>

        {/* Hero visual: morphing blob portrait */}
        <div className="relative mx-auto w-full max-w-[520px]">
          <div
            aria-hidden
            className="absolute inset-0 translate-x-4 translate-y-4 rotate-6 bg-gradient-to-br from-primary to-fuchsia-400 opacity-90 motion-safe:animate-blob"
            style={{ borderRadius: "58% 42% 55% 45% / 48% 55% 45% 52%" }}
          />
          <div
            className="relative aspect-square overflow-hidden border-[6px] border-card shadow-2xl [animation-delay:-5s] motion-safe:animate-blob"
            style={{ borderRadius: "42% 58% 40% 60% / 58% 42% 58% 42%" }}
          >
            <img
              src={heroDog}
              alt="Happy dog enjoying care at Petopia Veterinary Clinic"
              className="size-full scale-110 object-cover"
            />
          </div>

          <RotatingBadge className="absolute -top-4 -right-2 z-20 sm:-right-6" />

          <div
            className={cn(sticker, "top-[18%] -left-3 -rotate-6 sm:-left-10")}
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-red-100 dark:bg-red-500/20">
              <img src={asteriskIcon} alt="" className="h-[18px] w-[17px]" />
            </span>
            <span className="flex flex-col">
              <span className="text-[10px] font-bold tracking-wider text-red-600 uppercase dark:text-red-400">
                Always open
              </span>
              <span className="text-sm font-extrabold text-foreground">
                24/7 Urgent Care
              </span>
            </span>
          </div>

          <div
            className={cn(
              sticker,
              "right-2 -bottom-6 rotate-3 [animation-delay:-3s] sm:-right-4"
            )}
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-500/20">
              <img src={badgeCheckIcon} alt="" className="h-[20px] w-[21px]" />
            </span>
            <span className="flex flex-col">
              <span className="font-heading text-lg leading-6 font-extrabold text-foreground">
                99.8%
              </span>
              <span className="text-xs font-medium text-body">
                Recovery rate
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Species marquee ribbon */}
      <div className="relative -mx-4 -rotate-1 overflow-hidden border-y-2 border-foreground bg-primary py-3 text-primary-foreground">
        <div className="flex w-max motion-safe:animate-marquee">
          {[0, 1].map((copy) => (
            <div
              key={copy}
              aria-hidden={copy === 1}
              className="flex shrink-0 items-center"
            >
              {[...species, ...species].map((name, i) => (
                <Fragment key={`${name}-${i}`}>
                  <span className="px-6 font-heading text-lg font-extrabold tracking-wide uppercase">
                    {name}
                  </span>
                  <MaskIcon src={pawFilledIcon} className="size-5 opacity-70" />
                </Fragment>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
