import { useEffect, useState } from "react"
import { CheckIcon } from "lucide-react"
import { cn } from "cn"

import { MaskIcon } from "@/components/mask-icon"
import { Button } from "@/components/ui/button"
import copyIcon from "@/assets/icons/copy.svg"
import giftIcon from "@/assets/icons/gift.svg"
import pawLargeIcon from "@/assets/icons/paw-large.svg"

const PROMO_CODE = "PETOPIA20"

export function PromoBanner({ className }: { className?: string }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(PROMO_CODE)
      setCopied(true)
    } catch {
      // Clipboard can be blocked (e.g. insecure context); the code stays visible.
    }
  }

  return (
    <section className={cn("py-12 font-jakarta", className)}>
      <div className="page-container">
        <div className="relative overflow-hidden rounded-[36px] bg-gradient-to-r from-[#514b8f] via-[#5d569b] to-[#6a63a9] p-8 shadow-[0_20px_40px_-15px_rgba(106,99,169,0.18)] sm:p-12">
          {/* Decorative glow & paw */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-8 -right-12 size-64 rounded-full bg-white/10 blur-[20px]"
          />
          <MaskIcon
            src={pawLargeIcon}
            className="pointer-events-none absolute bottom-3.5 left-[64.54%] hidden h-[101.333px] w-[106.667px] text-white opacity-10 md:block"
          />

          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex max-w-[576px] flex-col items-start gap-2">
              <span className="flex items-center gap-1.5 rounded-full bg-white/20 px-3.5 py-1 text-xs leading-4 font-bold tracking-[0.3px] text-white uppercase backdrop-blur-md">
                <img
                  src={giftIcon}
                  alt=""
                  className="h-[11.083px] w-[11.667px]"
                />
                New patient welcome special
              </span>
              <h2 className="pt-1 font-heading text-[28px] leading-9 font-extrabold tracking-[-0.7px] text-white sm:text-4xl sm:leading-10 sm:tracking-[-0.9px]">
                Welcome to the Petopia Family: Enjoy 20% Off Your First Visit
              </h2>
              <p className="text-base leading-6 text-[#f0ebff]">
                Includes full head-to-tail wellness exam, nutrition guidance,
                and free pet welcome kit.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-4 rounded-3xl border border-white/30 bg-white/15 py-[13px] pr-2.5 pl-[17px] backdrop-blur-md">
                <div className="flex flex-col">
                  <span className="text-[10px] leading-[15px] font-medium tracking-[1px] text-white/70 uppercase">
                    Use promo code
                  </span>
                  <span className="font-heading text-base leading-6 font-extrabold tracking-[0.8px] text-[#fcd34d]">
                    {PROMO_CODE}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={copyCode}
                  aria-label={copied ? "Promo code copied" : "Copy promo code"}
                  className="flex size-8 items-center justify-center rounded-xl text-white transition-colors outline-none hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/60"
                >
                  {copied ? (
                    <CheckIcon className="size-4" />
                  ) : (
                    <MaskIcon src={copyIcon} className="h-[15px] w-[12.75px]" />
                  )}
                </button>
              </div>

              <Button
                nativeButton={false}
                render={<a href="#contact" />}
                className="h-auto rounded-3xl bg-white px-6 py-3.5 text-sm leading-5 font-bold text-[#514b8f] shadow-lg hover:bg-white/90"
              >
                Claim Your 20% Off
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
