import { cn } from "cn"

import { MaskIcon } from "@/components/mask-icon"
import { Button } from "@/components/ui/button"
import calendarCtaIcon from "@/assets/icons/calendar-cta.svg"
import pawCtaIcon from "@/assets/icons/paw-cta.svg"
import phoneCtaIcon from "@/assets/icons/phone-cta.svg"

export function CtaSection({ className }: { className?: string }) {
  return (
    <section className={cn("py-12 font-jakarta", className)}>
      <div className="page-container">
        <div className="relative overflow-hidden rounded-[36px] bg-[linear-gradient(158.83deg,#514b8f_0%,#6a63a9_50%,#4b4382_100%)] px-6 py-14 shadow-xl sm:py-16">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.1)_0%,transparent_50%)]"
          />

          <div className="relative mx-auto flex max-w-[672px] flex-col items-center text-center">
            <span className="mb-6 flex size-16 items-center justify-center rounded-full bg-white/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]">
              <img src={pawCtaIcon} alt="" className="h-[23.75px] w-[25px]" />
            </span>
            <h2 className="mb-4 font-heading text-[32px] leading-[1.1] font-extrabold tracking-[-0.8px] text-white sm:text-5xl sm:leading-[48px] sm:tracking-[-1.2px]">
              Ready to Experience the Petopia Difference?
            </h2>
            <p className="mb-8 max-w-[576px] text-base leading-7 text-[#f0ebff] sm:text-lg">
              Schedule your pet’s visit online in under two minutes. Same-day
              appointments and emergency walk-ins always welcome.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button
                nativeButton={false}
                render={<a href="#contact" />}
                className="h-auto gap-2 rounded-3xl bg-white px-8 py-4 text-base leading-6 font-bold text-[#514b8f] shadow-lg hover:bg-white/90"
              >
                <MaskIcon
                  src={calendarCtaIcon}
                  className="h-[16.667px] w-[15px]"
                />
                Book Online Now
              </Button>
              <Button
                variant="outline"
                nativeButton={false}
                render={<a href="tel:+18007386742" />}
                className="h-auto gap-2 rounded-3xl border-white/30 bg-transparent px-8 py-4 text-base leading-6 font-bold text-white hover:bg-white/10 hover:text-white dark:border-white/30 dark:bg-transparent dark:hover:bg-white/10"
              >
                <MaskIcon src={phoneCtaIcon} className="size-[15px]" />
                Call (800) PET-OPIA
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
