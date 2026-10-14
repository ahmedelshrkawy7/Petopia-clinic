import { Fragment } from "react"
import { cn } from "cn"

import { MaskIcon } from "@/components/mask-icon"
import { Button } from "@/components/ui/button"
import petopiaMark from "@/assets/brand/petopia-mark.png"
import heroDog from "@/assets/hero/hero-dog.png"
import petParent1 from "@/assets/hero/pet-parent-1.jpg"
import petParent2 from "@/assets/hero/pet-parent-2.jpg"
import petParent3 from "@/assets/hero/pet-parent-3.jpg"
import arrowRightIcon from "@/assets/icons/arrow-right.svg"
import asteriskIcon from "@/assets/icons/asterisk.svg"
import badgeCheckIcon from "@/assets/icons/badge-check.svg"
import calendarCheckIcon from "@/assets/icons/calendar-check.svg"
import pawFilledIcon from "@/assets/icons/paw-filled.svg"
import starIcon from "@/assets/icons/star.svg"
import underline from "@/assets/icons/underline.svg"

const petParents = [petParent1, petParent2, petParent3]

const species = [
  "Dogs",
  "Cats",
  "Birds",
  "Rabbits",
  "Reptiles",
  "Exotic pets",
  "Seniors",
  "Puppies & kittens",
]

// Paw prints scattered around the visual: [top, left, rotation, size]
const pawPrints = [
  ["6%", "-6%", "-25deg", "size-5"],
  ["16%", "-11%", "10deg", "size-4"],
  ["88%", "96%", "-15deg", "size-5"],
  ["96%", "88%", "20deg", "size-4"],
] as const

const glassCard =
  "absolute z-20 flex items-center gap-3 rounded-2xl bg-card/90 p-3 pr-5 shadow-[0_18px_40px_-16px_rgba(43,39,82,0.35)] ring-1 ring-border backdrop-blur-md motion-safe:animate-float"

// Circular "Caring like a Family" seal wrapped around the Petopia mark.
function BrandSeal({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex size-32 items-center justify-center rounded-full bg-sand text-sand-foreground shadow-[0_18px_40px_-14px_rgba(43,39,82,0.45)] ring-8 ring-background",
        className
      )}
    >
      <svg
        viewBox="0 0 100 100"
        aria-hidden
        className="absolute inset-0 size-full motion-safe:animate-[spin_24s_linear_infinite]"
      >
        <defs>
          <path
            id="hero-seal-circle"
            d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0"
          />
        </defs>
        <text className="fill-current text-[9px] font-bold uppercase">
          <textPath
            href="#hero-seal-circle"
            textLength="232"
            lengthAdjust="spacing"
          >
            Caring like a family • Petopia clinic •
          </textPath>
        </text>
      </svg>
      <span className="flex size-[58px] items-center justify-center rounded-full bg-card">
        <img src={petopiaMark} alt="" className="size-11 object-contain" />
      </span>
    </div>
  )
}

export function HeroSectionPlayful({ className }: { className?: string }) {
  return (
    <section
      id="home"
      className={cn("relative overflow-x-clip font-jakarta", className)}
    >
      {/* Soft brand wash with a faint dot grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[88%] bg-gradient-to-b from-brand-soft/70 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(var(--color-primary)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_30%_40%,black_20%,transparent_70%)] [background-size:24px_24px] opacity-[0.08]"
      />

      <div className="relative page-container grid items-center gap-16 pt-10 pb-20 lg:grid-cols-[1fr_1.02fr] lg:gap-12 lg:pt-16 lg:pb-24">
        {/* Copy & CTAs */}
        <div className="flex flex-col items-start gap-7">
          <span className="inline-flex items-center gap-2.5 rounded-full bg-card py-1.5 pr-4 pl-1.5 text-xs font-semibold text-body shadow-xs ring-1 ring-border sm:text-sm">
            <img src={petopiaMark} alt="" className="size-7 object-contain" />
            <span className="font-bold text-primary">Fear-Free Certified</span>
            <span aria-hidden className="h-3.5 w-px bg-border" />
            Award-winning pet care
          </span>

          <h1 className="font-heading text-[44px] leading-[1.02] font-extrabold tracking-[-1.5px] text-balance text-foreground sm:text-6xl lg:text-[70px] lg:tracking-[-2.5px]">
            Where every pet feels{" "}
            <span className="relative inline-block whitespace-nowrap text-primary">
              at home
              <MaskIcon
                src={underline}
                className="absolute -bottom-2.5 left-0 h-3 w-full text-sand"
              />
            </span>
            .
          </h1>

          <p className="max-w-[520px] text-base leading-7 text-body sm:text-lg sm:leading-8">
            Premium, fear-free veterinary medicine for dogs, cats and exotic
            pets. From urgent care to wellness checkups, our doctors treat your
            companions like family.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button
              nativeButton={false}
              render={<a href="#contact" />}
              className="h-auto gap-2.5 rounded-full px-7 py-4 text-base font-bold shadow-[0_18px_36px_-14px_var(--color-primary)] transition-transform hover:-translate-y-0.5"
            >
              <MaskIcon src={calendarCheckIcon} className="size-[18px]" />
              Book Appointment
            </Button>
            <a
              href="#services"
              className="group inline-flex items-center gap-2.5 rounded-full px-6 py-4 text-base font-bold text-primary ring-1 ring-primary/25 transition-colors ring-inset hover:bg-brand-soft"
            >
              Explore Services
              <MaskIcon
                src={arrowRightIcon}
                className="size-3.5 transition-transform group-hover:translate-x-1"
              />
            </a>
          </div>

          {/* Trust row */}
          <dl className="grid w-full max-w-[560px] grid-cols-2 gap-y-5 border-t border-border pt-7 sm:grid-cols-[auto_1fr_1fr] sm:divide-x sm:divide-border">
            <div className="col-span-2 flex items-center gap-3 sm:col-span-1 sm:pr-6">
              <div className="flex -space-x-3">
                {petParents.map((src) => (
                  <img
                    key={src}
                    src={src}
                    alt=""
                    className="size-10 rounded-full object-cover ring-[3px] ring-background"
                  />
                ))}
              </div>
              <div>
                <dt className="sr-only">Rating</dt>
                <dd className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }, (_, i) => (
                    <img key={i} src={starIcon} alt="" className="size-3" />
                  ))}
                  <span className="pl-1.5 text-sm font-extrabold text-foreground">
                    4.9
                  </span>
                </dd>
                <dd className="text-xs font-medium text-body">
                  5,000+ happy pets
                </dd>
              </div>
            </div>
            <div className="sm:px-6">
              <dd className="font-heading text-2xl font-extrabold text-foreground">
                15+
              </dd>
              <dt className="text-xs font-medium text-body">
                Years of excellence
              </dt>
            </div>
            <div className="sm:pl-6">
              <dd className="font-heading text-2xl font-extrabold text-foreground">
                18
              </dd>
              <dt className="text-xs font-medium text-body">
                Certified specialists
              </dt>
            </div>
          </dl>
        </div>

        {/* Hero visual: arched portrait on a sand tile, like the brand collage */}
        <div className="relative mx-auto w-full max-w-[540px] pt-6 pl-6 sm:pl-10">
          <div
            aria-hidden
            className="absolute top-0 bottom-10 left-0 w-[78%] rounded-[40px] bg-sand-soft"
          />
          <svg
            aria-hidden
            viewBox="0 0 400 180"
            fill="none"
            className="absolute -bottom-8 -left-12 w-[70%] text-sand"
          >
            <path
              d="M4 150 C 90 40, 190 190, 396 30"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray="9 11"
              strokeLinecap="round"
            />
          </svg>
          {pawPrints.map(([top, left, rotate, size]) => (
            <MaskIcon
              key={`${top}-${left}`}
              src={pawFilledIcon}
              className={cn("absolute hidden text-stone sm:block", size)}
              style={{ top, left, rotate }}
            />
          ))}

          <div className="relative aspect-[5/6] overflow-hidden rounded-[36px] rounded-tl-[180px] border-8 border-card bg-primary shadow-[0_40px_80px_-40px_rgba(43,39,82,0.6)]">
            <img
              src={heroDog}
              alt="Happy dog enjoying care at Petopia Veterinary Clinic"
              className="size-full object-cover object-[62%_center]"
            />
          </div>

          <BrandSeal className="absolute -top-2 -right-2 z-20 sm:-right-8" />

          <div className={cn(glassCard, "top-[38%] -left-2 sm:-left-12")}>
            <span className="flex size-10 items-center justify-center rounded-xl bg-red-100 dark:bg-red-500/20">
              <img src={asteriskIcon} alt="" className="h-[18px] w-[17px]" />
            </span>
            <span className="flex flex-col">
              <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-red-600 uppercase dark:text-red-400">
                <span className="relative flex size-1.5">
                  <span className="absolute inset-0 rounded-full bg-red-500 motion-safe:animate-ping" />
                  <span className="relative size-1.5 rounded-full bg-red-500" />
                </span>
                Immediate support
              </span>
              <span className="text-sm font-extrabold text-foreground">
                24/7 Urgent Care
              </span>
            </span>
          </div>

          <div
            className={cn(
              glassCard,
              "right-2 -bottom-6 [animation-delay:-3s] sm:-right-6"
            )}
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-500/20">
              <img src={badgeCheckIcon} alt="" className="h-[20px] w-[21px]" />
            </span>
            <span className="flex flex-col">
              <span className="flex items-baseline gap-2">
                <span className="font-heading text-lg leading-6 font-extrabold text-foreground">
                  99.8%
                </span>
                <span className="rounded-full bg-sand-soft px-2 py-0.5 text-[10px] font-bold text-sand-foreground dark:text-sand">
                  Top 1%
                </span>
              </span>
              <span className="text-xs font-medium text-body">
                Pet recovery rate
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Species ribbon */}
      <div className="relative border-y border-border bg-sand-soft py-4">
        <div className="flex w-max motion-safe:animate-marquee">
          {[0, 1].map((copy) => (
            <div
              key={copy}
              aria-hidden={copy === 1}
              className="flex shrink-0 items-center"
            >
              {[...species, ...species].map((name, i) => (
                <Fragment key={`${name}-${i}`}>
                  <span className="px-7 font-heading text-base font-extrabold tracking-wide text-primary uppercase">
                    {name}
                  </span>
                  <MaskIcon src={pawFilledIcon} className="size-4 text-sand" />
                </Fragment>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
