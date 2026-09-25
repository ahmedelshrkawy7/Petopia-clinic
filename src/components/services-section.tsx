import { useState } from "react"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import arrowRightIcon from "@/assets/icons/arrow-right.svg"
import medicalKitIcon from "@/assets/icons/medical-kit.svg"
import scanIcon from "@/assets/icons/scan.svg"
import shieldPlusIcon from "@/assets/icons/shield-plus.svg"
import spaIcon from "@/assets/icons/spa.svg"
import stethoscopeBadgeIcon from "@/assets/icons/stethoscope-badge.svg"
import syringeIcon from "@/assets/icons/syringe.svg"
import toothIcon from "@/assets/icons/tooth.svg"

type Category = "preventative" | "surgical" | "specialized"

type Service = {
  title: string
  description: string
  icon: string
  iconClassName: string
  category: Category
  cta: string
  href: string
  tag?: { label: string; className: string }
  ribbon?: string
}

const defaultTag = "bg-[rgba(228,223,255,0.4)] text-primary"

const services: Service[] = [
  {
    title: "Comprehensive Checkups",
    description:
      "Holistic physical examinations covering nose-to-tail vitals, weight assessment, cardiac rhythm, and proactive early wellness screening.",
    icon: shieldPlusIcon,
    iconClassName: "h-[25px] w-5",
    category: "preventative",
    cta: "Book Checkup",
    href: "#contact",
    tag: { label: "Routine care", className: defaultTag },
  },
  {
    title: "Vaccines & Immunization",
    description:
      "Tailored vaccination schedules for puppies, kittens, and seniors based on local travel, indoor/outdoor lifestyles, and breed considerations.",
    icon: syringeIcon,
    iconClassName: "h-[25.625px] w-[23.75px]",
    category: "preventative",
    cta: "Schedule Vaccines",
    href: "#contact",
    tag: {
      label: "Preventative",
      className: "bg-[rgba(207,201,254,0.4)] text-[#5d5987]",
    },
  },
  {
    title: "Advanced Soft & Ortho Surgery",
    description:
      "Sterile HEPA-filtered surgical theater equipped with continuous multi-parameter vital monitors and dedicated recovery nurse support.",
    icon: medicalKitIcon,
    iconClassName: "size-[25px]",
    category: "surgical",
    cta: "Consult Surgeon",
    href: "#contact",
    ribbon: "High tech",
  },
  {
    title: "Gentle Dental & Hygiene",
    description:
      "Ultrasonic scaling, subgingival polishing, and digital dental radiography to combat periodontal disease and freshen pet breath safely.",
    icon: toothIcon,
    iconClassName: "h-[22.531px] w-[22.5px]",
    category: "preventative",
    cta: "Book Dental Exam",
    href: "#contact",
    tag: { label: "Oral health", className: defaultTag },
  },
  {
    title: "Ultrasound & Digital X-Ray",
    description:
      "High-definition digital radiology and Doppler ultrasonography giving quick, non-invasive answers in under 30 minutes for acute illnesses.",
    icon: scanIcon,
    iconClassName: "h-[25px] w-[22.5px]",
    category: "specialized",
    cta: "Learn Diagnostics",
    href: "#contact",
    tag: {
      label: "Same-day results",
      className: "bg-[#fef3c7] text-[#92400e]",
    },
  },
  {
    title: "Therapeutic Spa & Grooming",
    description:
      "Hypoallergenic medicated hydro-baths, professional coat deshedding, sanitary trimming, ear flushing, and gentle paw nail pampering.",
    icon: spaIcon,
    iconClassName: "size-[25px]",
    category: "specialized",
    cta: "Book Spa Day",
    href: "#contact",
    tag: { label: "Wellness spa", className: defaultTag },
  },
]

const filters: { label: string; value: Category | "all" }[] = [
  { label: "All Services", value: "all" },
  { label: "Preventative", value: "preventative" },
  { label: "Surgical", value: "surgical" },
  { label: "Specialized", value: "specialized" },
]

function ServiceCard({ service }: { service: Service }) {
  return (
    <article
      className={cn(
        "relative flex flex-col justify-between overflow-hidden rounded-[32px] border bg-white/85 p-[29px] backdrop-blur-md",
        service.ribbon ? "border-primary/20" : "border-[rgba(235,231,237,0.7)]"
      )}
    >
      {service.ribbon && (
        <span className="absolute top-0 right-0 rounded-bl-2xl bg-primary px-3 py-1 text-[10px] leading-[15px] font-bold tracking-[0.5px] text-white uppercase">
          {service.ribbon}
        </span>
      )}

      <div className="flex flex-col gap-[7.3px] pb-6">
        <div className="flex items-center justify-between">
          <span className="flex size-14 items-center justify-center rounded-3xl bg-[#efeafd]">
            <img src={service.icon} alt="" className={service.iconClassName} />
          </span>
          {service.tag && (
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] leading-[16.5px] font-bold tracking-[0.55px] uppercase",
                service.tag.className
              )}
            >
              {service.tag.label}
            </span>
          )}
        </div>
        <h3 className="pt-[12.7px] font-heading text-xl leading-7 font-bold text-foreground">
          {service.title}
        </h3>
        <p className="text-sm leading-[22.75px] text-body">
          {service.description}
        </p>
      </div>

      <a
        href={service.href}
        className="group flex w-fit items-center gap-2 text-sm leading-5 font-bold text-primary"
      >
        {service.cta}
        <img
          src={arrowRightIcon}
          alt=""
          className="size-3 transition-transform group-hover:translate-x-0.5"
        />
      </a>
    </article>
  )
}

export function ServicesSection({ className }: { className?: string }) {
  const [filter, setFilter] = useState<Category | "all">("all")
  const visible =
    filter === "all"
      ? services
      : services.filter((service) => service.category === filter)

  return (
    <section
      id="services"
      className={cn("bg-[rgba(247,242,249,0.6)] py-24 font-jakarta", className)}
    >
      <div className="page-container flex flex-col gap-12">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex max-w-[672px] flex-col items-start gap-2">
            <span className="flex items-center gap-1.5 rounded-full border border-[rgba(201,196,209,0.3)] bg-white px-[13px] py-[5px] text-xs leading-4 font-bold tracking-[0.6px] text-primary uppercase">
              <img
                src={stethoscopeBadgeIcon}
                alt=""
                className="size-[11.637px]"
              />
              Complete veterinary services
            </span>
            <h2 className="pt-1 font-heading text-[28px] leading-9 font-extrabold tracking-[-0.7px] text-foreground sm:text-4xl sm:leading-10 sm:tracking-[-0.9px]">
              Tailored Healthcare for Every Stage of Life
            </h2>
            <p className="text-base leading-6 text-body">
              Equipped with modern surgical theaters, stress-free treatment
              rooms, and an in-house laboratory to give pets immediate diagnosis
              and tender care.
            </p>
          </div>

          <div
            role="group"
            aria-label="Filter services"
            className="flex flex-wrap gap-2"
          >
            {filters.map((item) => {
              const active = filter === item.value
              return (
                <Button
                  key={item.value}
                  variant={active ? "default" : "outline"}
                  aria-pressed={active}
                  onClick={() => setFilter(item.value)}
                  className={cn(
                    "h-auto rounded-full px-4 py-[9px] text-sm leading-5 font-semibold",
                    active
                      ? "shadow-[0_4px_7px_rgba(81,75,143,0.28)]"
                      : "border-[#e5e1e8] bg-white text-body"
                  )}
                >
                  {item.label}
                </Button>
              )
            })}
          </div>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((service) => (
            <ServiceCard key={service.title} service={service} />
          ))}
        </div>
      </div>
    </section>
  )
}
