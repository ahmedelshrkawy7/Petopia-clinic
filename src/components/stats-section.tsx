import { cn } from "cn"

import { MaskIcon } from "@/components/mask-icon"
import awardRibbonIcon from "@/assets/icons/award-ribbon.svg"
import headsetIcon from "@/assets/icons/headset.svg"
import medicalBagIcon from "@/assets/icons/medical-bag.svg"
import pawFilledIcon from "@/assets/icons/paw-filled.svg"

const stats = [
  {
    value: "15+",
    label: "Years of Excellence",
    icon: awardRibbonIcon,
    iconClassName: "h-[26.25px] w-5",
  },
  {
    value: "12k+",
    label: "Happy Pets Cared For",
    icon: pawFilledIcon,
    iconClassName: "h-[23.75px] w-[25px]",
  },
  {
    value: "18",
    label: "Certified Specialists",
    icon: medicalBagIcon,
    iconClassName: "size-[25px]",
  },
  {
    value: "24/7",
    label: "Emergency Care Hotline",
    icon: headsetIcon,
    iconClassName: "h-[22.5px] w-[25px]",
  },
]

export function StatsSection({ className }: { className?: string }) {
  return (
    <section id="stats" className={cn("py-16 font-jakarta", className)}>
      <div className="page-container">
        <dl className="grid gap-6 rounded-[32px] border border-border/70 bg-card p-[33px] shadow-xs sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className={cn(
                "flex items-center gap-4 py-2.5",
                i > 0 && "lg:border-l lg:border-border/60 lg:pl-[33px]"
              )}
            >
              <span className="flex size-14 shrink-0 items-center justify-center rounded-3xl bg-brand-soft">
                <MaskIcon
                  src={stat.icon}
                  className={cn("text-primary", stat.iconClassName)}
                />
              </span>
              <div className="flex flex-col-reverse">
                <dt className="max-w-[130px] text-sm leading-5 font-medium text-body">
                  {stat.label}
                </dt>
                <dd className="font-heading text-[30px] leading-9 font-extrabold text-primary">
                  {stat.value}
                </dd>
              </div>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
