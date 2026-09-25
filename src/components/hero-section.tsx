import { cn } from "cn"

import { MaskIcon } from "@/components/mask-icon"
import { Button } from "@/components/ui/button"
import heroDog from "@/assets/hero/hero-dog.png"
import petParent1 from "@/assets/hero/pet-parent-1.jpg"
import petParent2 from "@/assets/hero/pet-parent-2.jpg"
import petParent3 from "@/assets/hero/pet-parent-3.jpg"
import asteriskIcon from "@/assets/icons/asterisk.svg"
import awardIcon from "@/assets/icons/award.svg"
import badgeCheckIcon from "@/assets/icons/badge-check.svg"
import calendarCheckIcon from "@/assets/icons/calendar-check.svg"
import playCircleIcon from "@/assets/icons/play-circle.svg"
import starIcon from "@/assets/icons/star.svg"
import underline from "@/assets/icons/underline.svg"

const petParents = [petParent1, petParent2, petParent3]

const floatingCard =
  "absolute flex items-center gap-3 rounded-3xl border border-border/60 bg-card/95 p-[15px] shadow-[0_14px_30px_0_rgba(28,27,32,0.08)] dark:shadow-black/40 backdrop-blur-md"

export function HeroSection({ className }: { className?: string }) {
  return (
    <section
      id="home"
      className={cn("relative overflow-x-clip font-jakarta", className)}
    >
      {/* Ambient blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-20 size-[550px] rounded-full bg-[radial-gradient(circle,var(--glow)_0%,transparent_70%)] blur-[20px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-10 left-10 size-[350px] rounded-full bg-glow/40 blur-[32px]"
      />

      <div className="relative page-container grid items-center gap-12 pt-10 pb-20 lg:grid-cols-2 lg:pt-14 lg:pb-24">
        {/* Copy & CTAs */}
        <div className="flex flex-col items-start gap-6">
          <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-brand-soft px-4 py-[7px] shadow-xs">
            <span className="size-2 shrink-0 rounded-full bg-primary" />
            <MaskIcon
              src={awardIcon}
              className="h-[14.875px] w-[15.583px] text-primary"
            />
            <span className="text-xs font-semibold text-primary sm:text-sm">
              Award-Winning Pet Care in Town • Fear-Free Certified
            </span>
          </div>

          <h1 className="font-heading text-[40px] leading-[1.05] font-extrabold tracking-[-1px] text-foreground sm:text-5xl lg:text-[60px] lg:leading-[60px] lg:tracking-[-1.5px]">
            Where Every Pet
            <br />
            Feels{" "}
            <span className="relative inline-block text-primary">
              at Home
              <img
                src={underline}
                alt=""
                aria-hidden
                className="absolute -bottom-2 left-[7.14%] h-[10.5px] w-[85.72%]"
              />
            </span>
          </h1>

          <p className="max-w-[576px] text-base leading-7 text-body sm:text-lg">
            Experience premium, fear-free veterinary medicine tailored for dogs,
            cats, and exotic pets. From urgent care to wellness checkups, our
            loving doctors treat your furry companions like family.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Button
              nativeButton={false}
              render={<a href="#contact" />}
              className="h-auto gap-2.5 rounded-3xl px-7 py-3.5 text-base font-semibold shadow-[0_20px_40px_-15px_rgba(106,99,169,0.18)]"
            >
              <MaskIcon
                src={calendarCheckIcon}
                className="h-[16.667px] w-[15px]"
              />
              Book Appointment
            </Button>
            <Button
              variant="outline"
              nativeButton={false}
              render={<a href="#services" />}
              className="h-auto gap-2 rounded-3xl border-[#c9c4d1] bg-card px-[25px] py-[15px] text-base font-semibold shadow-xs dark:border-border dark:bg-card"
            >
              <MaskIcon
                src={playCircleIcon}
                className="size-[16.667px] text-primary"
              />
              Explore Services
            </Button>
          </div>

          <div className="flex w-full items-center gap-4 border-t border-border pt-[17px]">
            <div className="flex shrink-0">
              {petParents.map((src) => (
                <img
                  key={src}
                  src={src}
                  alt="Pet parent"
                  className="-mr-2.5 size-9 rounded-full object-cover shadow-[0_0_0_2px_var(--background)]"
                />
              ))}
              <span className="flex size-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-[0_0_0_2px_var(--background)]">
                5k+
              </span>
            </div>
            <div className="text-xs">
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }, (_, i) => (
                  <img
                    key={i}
                    src={starIcon}
                    alt=""
                    className="h-[11.083px] w-[11.667px]"
                  />
                ))}
                <span className="pl-1 font-bold text-foreground">
                  4.9 / 5.0
                </span>
              </div>
              <p className="font-medium text-body">
                Over 5,000+ happy pets treated with love
              </p>
            </div>
          </div>
        </div>

        {/* Hero visual */}
        <div className="relative mx-3 lg:mx-0">
          <div className="relative overflow-hidden rounded-[42px] border-4 border-card bg-[#6a63a9] p-1 shadow-2xl">
            <img
              src={heroDog}
              alt="Happy dog enjoying care at Petopia Veterinary Clinic"
              className="h-[280px] w-full rounded-[34px] object-cover sm:h-[396px]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent via-50% to-transparent" />
            <div className="absolute top-4 left-4 flex items-center gap-2 rounded-3xl border border-border/70 bg-card/85 px-[15px] py-[7px] shadow-md backdrop-blur-md">
              <span className="size-2 rounded-full bg-[#10b981]" />
              <span className="font-heading text-xs leading-4 font-bold text-foreground">
                Petopia Care Center
              </span>
            </div>
          </div>

          <div className={cn(floatingCard, "-top-5 -left-3 lg:-left-8")}>
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#fef2f2] shadow-xs dark:bg-red-500/15">
              <img src={asteriskIcon} alt="" className="h-[18px] w-[17.3px]" />
            </span>
            <span className="flex flex-col">
              <span className="text-[11px] leading-[16.5px] font-bold tracking-[0.55px] text-[#dc2626] uppercase dark:text-red-400">
                Immediate support
              </span>
              <span className="text-sm leading-5 font-bold text-foreground">
                24/7 Urgent Care
              </span>
            </span>
          </div>

          <div className={cn(floatingCard, "-right-3 -bottom-6 lg:-right-6")}>
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#ecfdf5] shadow-xs dark:bg-emerald-500/15">
              <img src={badgeCheckIcon} alt="" className="h-[21px] w-[22px]" />
            </span>
            <span className="flex flex-col">
              <span className="flex items-center gap-1">
                <span className="font-heading text-base leading-6 font-extrabold text-foreground">
                  99.8%
                </span>
                <span className="rounded-full bg-[#d1fae5] px-1.5 text-[10px] leading-[15px] font-semibold text-[#065f46] dark:bg-emerald-500/20 dark:text-emerald-300">
                  Top 1%
                </span>
              </span>
              <span className="text-xs leading-4 font-medium text-body">
                Pet Recovery Rate
              </span>
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
