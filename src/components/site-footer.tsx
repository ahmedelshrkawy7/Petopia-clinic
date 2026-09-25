import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  newsletterSchema,
  type NewsletterFormValues,
} from "@/lib/newsletter-schema"
import sirenIcon from "@/assets/icons/siren.svg"
import petopiaLogoWhite from "@/assets/brand/petopia-logo-white.png"

const services = [
  "Wellness Examinations",
  "Vaccine Programs",
  "Digital X-Ray & Ultrasound",
  "Dentistry & Extractions",
  "Orthopedic Surgery",
  "Pet Spa & Medical Bath",
]

const hours = [
  { days: "Monday - Friday:", time: "7:00 AM - 9:00 PM" },
  { days: "Saturday:", time: "8:00 AM - 7:00 PM" },
  { days: "Sunday:", time: "9:00 AM - 6:00 PM" },
]

const contact = [
  {
    label: "📍 Address:",
    value: "742 Evergreen Terrace, Suite 100, Cityville",
  },
  {
    label: "📞 Front Desk:",
    value: "(800) 738-6742",
    href: "tel:+18007386742",
  },
  {
    label: "✉️ Email:",
    value: "care@petopiaclinic.com",
    href: "mailto:care@petopiaclinic.com",
  },
]

const legalLinks = ["Privacy Policy", "Terms of Care", "Patient Portal"]

const heading =
  "font-heading text-sm leading-5 font-bold tracking-[0.7px] text-white uppercase"

type SiteFooterProps = {
  /** Called with a validated email. Wire this to your mailing list; defaults to a short fake delay. */
  onSubscribe?: (values: NewsletterFormValues) => Promise<void> | void
  className?: string
}

function NewsletterForm({ onSubscribe }: Pick<SiteFooterProps, "onSubscribe">) {
  const [subscribed, setSubscribed] = useState(false)
  const form = useForm<NewsletterFormValues>({
    resolver: zodResolver(newsletterSchema),
    defaultValues: { email: "" },
  })

  const onSubmit = async (values: NewsletterFormValues) => {
    if (onSubscribe) await onSubscribe(values)
    else await new Promise((resolve) => setTimeout(resolve, 600))
    setSubscribed(true)
    form.reset()
  }

  if (subscribed) {
    return (
      <p
        role="status"
        className="text-xs leading-5 font-semibold text-[#34d399]"
      >
        Thanks! You’re on the list for monthly pet care tips.
      </p>
    )
  }

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-2"
    >
      <Controller
        control={form.control}
        name="email"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} className="gap-1.5">
            <FieldLabel htmlFor="newsletter-email" className="sr-only">
              Email address
            </FieldLabel>
            <Input
              {...field}
              id="newsletter-email"
              type="email"
              autoComplete="email"
              placeholder="Enter your email"
              aria-invalid={fieldState.invalid}
              className="h-10 rounded-2xl border-white/15 bg-white/10 px-[15px] text-xs text-white placeholder:text-white/40 dark:bg-white/10"
            />
            <FieldError
              errors={[fieldState.error]}
              className="text-xs text-red-400"
            />
          </Field>
        )}
      />
      <Button
        type="submit"
        disabled={form.formState.isSubmitting}
        className="h-auto w-full rounded-2xl bg-[#514b8f] py-2.5 text-xs leading-4 font-bold text-white hover:bg-[#5d569b]"
      >
        {form.formState.isSubmitting ? "Subscribing…" : "Subscribe"}
      </Button>
    </form>
  )
}

export function SiteFooter({ onSubscribe, className }: SiteFooterProps) {
  return (
    <footer
      className={cn(
        "border-t border-[rgba(120,117,129,0.2)] bg-[#1c1b20] pt-16 pb-12 font-jakarta",
        className
      )}
    >
      <div className="page-container">
        {/* Brand & emergency */}
        <div className="grid items-center gap-8 border-b border-white/10 pb-12 lg:grid-cols-2">
          <a href="#home" className="w-fit">
            <img
              src={petopiaLogoWhite}
              alt="Petopia Veterinary Clinic LLC"
              className="h-16 w-auto"
            />
          </a>

          <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/5 p-[17px]">
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-red-500/20">
                <img src={sirenIcon} alt="" className="h-[17px] w-[22px]" />
              </span>
              <span className="flex flex-col">
                <span className="text-xs leading-4 font-bold tracking-[0.6px] text-[#f87171] uppercase">
                  Emergency walk-ins
                </span>
                <span className="text-sm leading-5 font-semibold text-white">
                  24/7 Triage &amp; Critical Animal Care
                </span>
              </span>
            </div>
            <a
              href="tel:+18007386742"
              className="rounded-2xl bg-[#dc2626] px-4 py-2.5 text-xs leading-4 font-bold text-white transition-colors hover:bg-[#b91c1c]"
            >
              Call ER Desk
            </a>
          </div>
        </div>

        {/* Link columns */}
        <div className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-5 lg:gap-8">
          <div className="flex flex-col gap-6 sm:col-span-2">
            <p className="max-w-[384px] text-sm leading-[22.75px] text-white/70">
              Petopia Veterinary Clinic is dedicated to compassionate, fear-free
              pet care with cutting-edge medicine, surgical precision, and
              heartfelt kindness for every family.
            </p>
            <address className="flex flex-col gap-1.5 text-xs leading-4 not-italic">
              {contact.map((item) => (
                <p key={item.label}>
                  <span className="font-semibold text-white">
                    {item.label}{" "}
                  </span>
                  {item.href ? (
                    <a
                      href={item.href}
                      className="text-white/60 transition-colors hover:text-white"
                    >
                      {item.value}
                    </a>
                  ) : (
                    <span className="text-white/60">{item.value}</span>
                  )}
                </p>
              ))}
            </address>
          </div>

          <nav aria-label="Services" className="flex flex-col gap-4">
            <h3 className={heading}>Services</h3>
            <ul className="flex flex-col gap-2.5">
              {services.map((service) => (
                <li key={service}>
                  <a
                    href="#services"
                    className="text-xs leading-4 text-white/70 transition-colors hover:text-white"
                  >
                    {service}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex flex-col gap-4">
            <h3 className={heading}>Hours</h3>
            <dl className="flex flex-col gap-2 text-xs leading-4">
              {hours.map((row) => (
                <div key={row.days} className="flex justify-between gap-3">
                  <dt className="text-white/70">{row.days}</dt>
                  <dd className="font-medium text-white">{row.time}</dd>
                </div>
              ))}
              <div className="flex items-center gap-1 border-t border-white/10 pt-[9px] font-semibold text-[#34d399]">
                <span className="size-1.5 rounded-full bg-[#34d399]" />
                24/7 Emergency Triage Open
              </div>
            </dl>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className={heading}>Pet care tips</h3>
            <p className="pt-1 text-xs leading-4 text-white/70">
              Join our monthly newsletter for seasonal health advice and clinic
              promotions.
            </p>
            <NewsletterForm onSubscribe={onSubscribe} />
          </div>
        </div>

        {/* Legal */}
        <div className="flex flex-col gap-4 border-t border-white/10 pt-8 text-xs leading-4 text-white/50 md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} Petopia Veterinary Clinic LLC. All
            rights reserved. Compassionate pet wellness made with love.
          </p>
          <nav aria-label="Legal" className="flex flex-wrap gap-6">
            {legalLinks.map((link) => (
              <a
                key={link}
                href="#"
                className="transition-colors hover:text-white"
              >
                {link}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  )
}
