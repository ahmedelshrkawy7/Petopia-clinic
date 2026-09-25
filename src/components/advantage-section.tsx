import { cn } from "cn"

import { MaskIcon } from "@/components/mask-icon"
import drClaraVance from "@/assets/advantage/dr-clara-vance.jpg"
import vetExam from "@/assets/advantage/vet-exam.jpg"
import checkCircleIcon from "@/assets/icons/check-circle.svg"
import heartIcon from "@/assets/icons/heart.svg"
import microscopeIcon from "@/assets/icons/microscope.svg"
import receiptIcon from "@/assets/icons/receipt.svg"

const benefits = [
  {
    title: "Fear-Free Certified Environment",
    description:
      "Separate feline and canine waiting nooks, pheromone-calmed suites, and non-slip heated examination tables.",
    icon: heartIcon,
    iconClassName: "h-[18.35px] w-5",
  },
  {
    title: "State-of-the-Art In-House Diagnostics",
    description:
      "Comprehensive blood chemistry, digital radiology, and cytology equipment delivering answers before you leave.",
    icon: microscopeIcon,
    iconClassName: "h-[19px] w-[14px]",
  },
  {
    title: "Transparent Estimates & Care Plans",
    description:
      "No surprise charges. Itemized medical treatment estimates are reviewed upfront with options that respect your budget.",
    icon: receiptIcon,
    iconClassName: "h-5 w-[18px]",
  },
]

export function AdvantageSection({ className }: { className?: string }) {
  return (
    <section id="why-petopia" className={cn("py-24 font-jakarta", className)}>
      <div className="page-container grid items-center gap-12 lg:grid-cols-2">
        {/* Benefits */}
        <div className="flex flex-col gap-8">
          <div className="flex flex-col items-start gap-3">
            <span className="rounded-full bg-[#e4dfff] px-3.5 py-1 text-xs leading-4 font-bold tracking-[0.6px] text-primary uppercase dark:bg-brand-soft">
              The Petopia advantage
            </span>
            <h2 className="font-heading text-[28px] leading-9 font-extrabold tracking-[-0.7px] text-foreground sm:text-4xl sm:leading-10 sm:tracking-[-0.9px]">
              Designed for Calmer Pets &amp; Reassured Pet Parents
            </h2>
            <p className="max-w-[560px] text-base leading-6 text-body">
              We reimagined veterinary medicine from the ground up to eliminate
              clinic anxiety and provide clear, empathetic guidance at every
              appointment.
            </p>
          </div>

          <ul className="flex flex-col gap-3.5">
            {benefits.map((benefit) => (
              <li
                key={benefit.title}
                className="flex items-start gap-4 rounded-3xl border border-border/70 bg-card p-[21px] shadow-xs"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                  <MaskIcon
                    src={benefit.icon}
                    className={cn("text-primary", benefit.iconClassName)}
                  />
                </span>
                <div className="flex flex-col gap-1">
                  <h3 className="font-heading text-base leading-6 font-bold text-foreground">
                    {benefit.title}
                  </h3>
                  <p className="text-sm leading-5 text-body">
                    {benefit.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Photo & vet quote */}
        <div className="flex flex-col gap-4 rounded-[36px] bg-[linear-gradient(46.66deg,rgba(106,99,169,0.2)_0%,var(--brand-soft)_100%)] p-5 sm:p-8">
          <div className="relative overflow-hidden rounded-[32px] shadow-lg">
            <img
              src={vetExam}
              alt="Veterinarian examining a smiling dog at Petopia"
              className="h-[260px] w-full object-cover sm:h-[393px]"
            />
            <span className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-2xl bg-black/60 px-3 py-1.5 text-xs leading-4 text-white backdrop-blur-md">
              <img src={checkCircleIcon} alt="" className="size-[11.667px]" />
              Fear-Free Certified Clinic
            </span>
          </div>

          <figure className="flex flex-col gap-2 rounded-3xl border border-card bg-card/85 p-[21px] shadow-[0_14px_30px_0_rgba(28,27,32,0.08)] backdrop-blur-md">
            <figcaption className="flex items-center gap-3">
              <img
                src={drClaraVance}
                alt="Dr. Clara Vance"
                className="size-10 rounded-full bg-primary/20 object-cover"
              />
              <span className="flex flex-col">
                <span className="font-heading text-sm leading-5 font-bold text-foreground">
                  Dr. Clara Vance, DVM
                </span>
                <span className="text-xs leading-4 font-semibold text-primary">
                  Chief Medical Director • Petopia Clinic
                </span>
              </span>
            </figcaption>
            <blockquote className="text-sm leading-5 text-body italic">
              “At Petopia, our mission is to make trips to the vet something
              pets genuinely enjoy. High-tech medicine is at its best when
              delivered with gentle hands and kind words.”
            </blockquote>
          </figure>
        </div>
      </div>
    </section>
  )
}
