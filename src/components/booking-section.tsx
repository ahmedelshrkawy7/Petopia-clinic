import { useState, type ReactNode } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { addDays, format, isSameDay, isToday, startOfToday } from "date-fns"
import { cn } from "cn"

import { MaskIcon } from "@/components/mask-icon"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  bookingSchema,
  isSlotInPast,
  PET_TYPES,
  SERVICES,
  SPECIALISTS,
  TIME_SLOTS,
  type BookingFormInput,
  type BookingFormValues,
} from "@/lib/booking-schema"
import asteriskSmallIcon from "@/assets/icons/asterisk-small.svg"
import calendarCustomIcon from "@/assets/icons/calendar-custom.svg"
import calendarSmallIcon from "@/assets/icons/calendar-small.svg"
import checkCircleOutlineIcon from "@/assets/icons/check-circle-outline.svg"
import checkCircleSmallIcon from "@/assets/icons/check-circle-small.svg"
import petBirdIcon from "@/assets/icons/pet-bird.svg"
import petCatIcon from "@/assets/icons/pet-cat.svg"
import petDogIcon from "@/assets/icons/pet-dog.svg"
import petOtherIcon from "@/assets/icons/pet-other.svg"
import phoneSmallIcon from "@/assets/icons/phone-small.svg"
import shieldCheckIcon from "@/assets/icons/shield-check.svg"
import spaSmallIcon from "@/assets/icons/spa-small.svg"

const petOptions: Record<
  (typeof PET_TYPES)[number],
  { label: string; icon: string; iconClassName: string }
> = {
  dog: { label: "Dog", icon: petDogIcon, iconClassName: "h-[19px] w-5" },
  cat: { label: "Cat", icon: petCatIcon, iconClassName: "h-5 w-[14px]" },
  exotic: {
    label: "Bird / Exotic",
    icon: petBirdIcon,
    iconClassName: "h-[21.5px] w-5",
  },
  other: {
    label: "Other Pet",
    icon: petOtherIcon,
    iconClassName: "h-5 w-[19px]",
  },
}

const promises = [
  "Zero wait-time priority guarantee for pre-scheduled visits.",
  "Separate cozy canine and feline reception suites.",
  "Calming pheromone infusion throughout clinic exam rooms.",
]

const formatSlot = (slot: string) =>
  format(new Date(`2000-01-01T${slot}`), "hh:mm a")

function dayLabel(date: Date, offset: number) {
  const prefix =
    offset === 0 ? "Today" : offset === 1 ? "Tomorrow" : format(date, "EEEE")
  return `${prefix}, ${format(date, "MMM d")}`
}

function StepLabel({
  step,
  htmlFor,
  children,
}: {
  step?: number
  htmlFor?: string
  children: ReactNode
}) {
  const Tag = htmlFor ? "label" : "span"
  return (
    <Tag
      htmlFor={htmlFor}
      className="flex items-center gap-2 text-xs leading-4 font-bold tracking-[0.6px] text-foreground uppercase"
    >
      {step && (
        <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-[11px] text-primary">
          {step}
        </span>
      )}
      {children}
    </Tag>
  )
}

const pill =
  "rounded-full border px-4 py-2 text-xs leading-4 font-semibold transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
const pillActive =
  "border-primary bg-primary text-primary-foreground shadow-[0_4px_7px_rgba(81,75,143,0.28)]"
const pillIdle = "border-border bg-card text-body hover:border-primary/40"

const textInput =
  "h-12 rounded-2xl border-border bg-card px-[13px] text-sm placeholder:text-[#6b7280] dark:bg-card dark:placeholder:text-muted-foreground"

type BookingSectionProps = {
  /** Called with validated values. Wire this to your API; defaults to a short fake delay. */
  onBook?: (values: BookingFormValues) => Promise<void> | void
  className?: string
}

export function BookingSection({ onBook, className }: BookingSectionProps) {
  const today = startOfToday()
  const quickDays = [0, 1, 2].map((offset) => addDays(today, offset))
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [booked, setBooked] = useState<BookingFormValues | null>(null)

  const form = useForm<BookingFormInput, unknown, BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      petType: "dog",
      service: "wellness",
      specialist: "any",
      date: today,
      fullName: "",
      phone: "",
      petInfo: "",
    },
  })
  const selectedDate = useWatch({ control: form.control, name: "date" })
  const isCustomDate =
    selectedDate && !quickDays.some((day) => isSameDay(day, selectedDate))

  const onSubmit = async (values: BookingFormValues) => {
    if (onBook) await onBook(values)
    else await new Promise((resolve) => setTimeout(resolve, 800))
    setBooked(values)
  }

  const bookAnother = () => {
    form.reset()
    setBooked(null)
  }

  return (
    <section id="contact" className={cn("py-24 font-jakarta", className)}>
      <div className="page-container flex flex-col items-center gap-12">
        <div className="flex max-w-[672px] flex-col items-center gap-3 text-center">
          <span className="flex items-center gap-1.5 rounded-full bg-[#e4dfff] px-3.5 py-1 text-xs leading-4 font-bold tracking-[0.6px] text-primary uppercase dark:bg-brand-soft">
            <MaskIcon
              src={calendarSmallIcon}
              className="h-[11.667px] w-[11.083px]"
            />
            Easy online booking
          </span>
          <h2 className="font-heading text-[28px] leading-9 font-extrabold tracking-[-0.7px] text-foreground sm:text-4xl sm:leading-10 sm:tracking-[-0.9px]">
            Schedule Your Pet’s Visit in Minutes
          </h2>
          <p className="text-base leading-6 text-body">
            Select your service, choose a convenient date, and reserve a
            fear-free consultation with our compassionate team.
          </p>
        </div>

        <div className="grid w-full items-start gap-8 lg:grid-cols-12">
          {/* Booking form */}
          <div className="rounded-[32px] border border-border/70 bg-card p-5 shadow-xs sm:p-[33px] lg:col-span-8">
            {booked ? (
              <div
                role="status"
                className="flex flex-col items-center gap-4 py-10 text-center"
              >
                <span className="flex size-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/15">
                  <img src={shieldCheckIcon} alt="" className="h-6 w-5" />
                </span>
                <h3 className="font-heading text-2xl font-extrabold text-foreground">
                  You’re booked, {booked.fullName.split(" ")[0]}!
                </h3>
                <p className="max-w-md text-sm leading-6 text-body">
                  We’ll see {booked.petInfo} for a{" "}
                  <b className="text-foreground">
                    {SERVICES.find((s) => s.value === booked.service)?.label}
                  </b>{" "}
                  on{" "}
                  <b className="text-foreground">
                    {format(booked.date, "EEEE, MMM d")} at{" "}
                    {formatSlot(booked.time)}
                  </b>
                  . We’ll text a confirmation to {booked.phone}.
                </p>
                <Button
                  variant="outline"
                  onClick={bookAnother}
                  className="h-auto rounded-3xl px-6 py-3 text-sm font-bold"
                >
                  Book another visit
                </Button>
              </div>
            ) : (
              <form
                noValidate
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex flex-col gap-7"
              >
                {/* Step 1: pet type */}
                <Controller
                  control={form.control}
                  name="petType"
                  render={({ field, fieldState }) => (
                    <div className="flex flex-col gap-3">
                      <StepLabel step={1}>Choose your pet type</StepLabel>
                      <div
                        role="radiogroup"
                        aria-label="Pet type"
                        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
                      >
                        {PET_TYPES.map((type) => {
                          const option = petOptions[type]
                          const active = field.value === type
                          return (
                            <button
                              key={type}
                              type="button"
                              role="radio"
                              aria-checked={active}
                              onClick={() => field.onChange(type)}
                              className={cn(
                                "flex flex-col items-center justify-center gap-1 rounded-3xl py-4 text-sm leading-5 font-semibold transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                                active
                                  ? "border-2 border-primary bg-brand-soft text-primary shadow-xs"
                                  : "border border-border bg-card text-foreground hover:border-primary/40"
                              )}
                            >
                              <MaskIcon
                                src={option.icon}
                                className={cn(
                                  option.iconClassName,
                                  active
                                    ? "text-primary"
                                    : "text-[#5d5987] dark:text-body"
                                )}
                              />
                              {option.label}
                            </button>
                          )
                        })}
                      </div>
                      <FieldError errors={[fieldState.error]} />
                    </div>
                  )}
                />

                {/* Step 2: service & specialist */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Controller
                    control={form.control}
                    name="service"
                    render={({ field, fieldState }) => (
                      <Field
                        data-invalid={fieldState.invalid}
                        className="gap-2"
                      >
                        <StepLabel step={2} htmlFor="booking-service">
                          Service / reason
                        </StepLabel>
                        <Select
                          items={SERVICES}
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger
                            id="booking-service"
                            aria-invalid={fieldState.invalid}
                            className="h-12! w-full rounded-2xl border-border bg-card px-[13px] text-foreground dark:bg-card"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SERVICES.map((s) => (
                              <SelectItem key={s.value} value={s.value}>
                                {s.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FieldError errors={[fieldState.error]} />
                      </Field>
                    )}
                  />
                  <Controller
                    control={form.control}
                    name="specialist"
                    render={({ field, fieldState }) => (
                      <Field
                        data-invalid={fieldState.invalid}
                        className="gap-2"
                      >
                        <StepLabel htmlFor="booking-specialist">
                          Preferred specialist
                        </StepLabel>
                        <Select
                          items={SPECIALISTS}
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger
                            id="booking-specialist"
                            aria-invalid={fieldState.invalid}
                            className="h-12! w-full rounded-2xl border-border bg-card px-[13px] text-foreground dark:bg-card"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SPECIALISTS.map((s) => (
                              <SelectItem key={s.value} value={s.value}>
                                {s.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FieldError errors={[fieldState.error]} />
                      </Field>
                    )}
                  />
                </div>

                {/* Step 3: date & time */}
                <div className="flex flex-col gap-2">
                  <StepLabel step={3}>Preferred date &amp; time slot</StepLabel>
                  <Controller
                    control={form.control}
                    name="date"
                    render={({ field, fieldState }) => (
                      <>
                        <div
                          role="radiogroup"
                          aria-label="Date"
                          className="flex flex-wrap gap-2"
                        >
                          {quickDays.map((day, offset) => {
                            const active =
                              !!field.value && isSameDay(field.value, day)
                            return (
                              <button
                                key={day.toISOString()}
                                type="button"
                                role="radio"
                                aria-checked={active}
                                onClick={() => {
                                  field.onChange(day)
                                  form.trigger("time")
                                }}
                                className={cn(
                                  pill,
                                  active ? pillActive : pillIdle
                                )}
                              >
                                {dayLabel(day, offset)}
                              </button>
                            )
                          })}
                          <Popover
                            open={calendarOpen}
                            onOpenChange={setCalendarOpen}
                          >
                            <PopoverTrigger
                              render={
                                <button
                                  type="button"
                                  className={cn(
                                    pill,
                                    "flex items-center gap-1",
                                    isCustomDate ? pillActive : pillIdle
                                  )}
                                />
                              }
                            >
                              <MaskIcon
                                src={calendarCustomIcon}
                                className="h-[11.667px] w-[10.5px]"
                              />
                              {isCustomDate
                                ? format(selectedDate, "EEE, MMM d")
                                : "Custom Date"}
                            </PopoverTrigger>
                            <PopoverContent
                              align="start"
                              className="w-auto p-0"
                            >
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={(date) => {
                                  if (!date) return
                                  field.onChange(date)
                                  form.trigger("time")
                                  setCalendarOpen(false)
                                }}
                                disabled={{ before: today }}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <FieldError errors={[fieldState.error]} />
                      </>
                    )}
                  />
                  <Controller
                    control={form.control}
                    name="time"
                    render={({ field, fieldState }) => (
                      <>
                        <div
                          role="radiogroup"
                          aria-label="Time slot"
                          className="grid grid-cols-3 gap-2 pt-1 sm:grid-cols-5"
                        >
                          {TIME_SLOTS.map((slot) => {
                            const active = field.value === slot
                            const past =
                              !!selectedDate && isSlotInPast(selectedDate, slot)
                            return (
                              <button
                                key={slot}
                                type="button"
                                role="radio"
                                aria-checked={active}
                                disabled={past}
                                onClick={() => field.onChange(slot)}
                                className={cn(
                                  "rounded-2xl border py-3 text-xs leading-4 font-semibold transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-40",
                                  active
                                    ? "border-2 border-primary bg-primary text-primary-foreground shadow-xs"
                                    : "border-border text-foreground enabled:hover:border-primary/40"
                                )}
                              >
                                {formatSlot(slot)}
                              </button>
                            )
                          })}
                        </div>
                        <FieldError errors={[fieldState.error]} />
                      </>
                    )}
                  />
                  {selectedDate && isToday(selectedDate) && (
                    <p className="text-xs text-muted-foreground">
                      Past time slots for today are unavailable.
                    </p>
                  )}
                </div>

                {/* Step 4: contact info */}
                <div className="flex flex-col gap-2">
                  <StepLabel step={4}>Patient &amp; guardian info</StepLabel>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {(
                      [
                        {
                          name: "fullName",
                          label: "Your full name",
                          placeholder: "Your Full Name",
                          autoComplete: "name",
                          type: "text",
                        },
                        {
                          name: "phone",
                          label: "Phone",
                          placeholder: "Phone (e.g. 555-0192)",
                          autoComplete: "tel",
                          type: "tel",
                        },
                        {
                          name: "petInfo",
                          label: "Pet's name and age",
                          placeholder: "Pet's Name & Age",
                          autoComplete: "off",
                          type: "text",
                        },
                      ] as const
                    ).map((input) => (
                      <Controller
                        key={input.name}
                        control={form.control}
                        name={input.name}
                        render={({ field, fieldState }) => (
                          <Field
                            data-invalid={fieldState.invalid}
                            className="gap-1.5"
                          >
                            <FieldLabel
                              htmlFor={`booking-${input.name}`}
                              className="sr-only"
                            >
                              {input.label}
                            </FieldLabel>
                            <Input
                              {...field}
                              id={`booking-${input.name}`}
                              type={input.type}
                              autoComplete={input.autoComplete}
                              placeholder={input.placeholder}
                              aria-invalid={fieldState.invalid}
                              className={textInput}
                            />
                            <FieldError errors={[fieldState.error]} />
                          </Field>
                        )}
                      />
                    ))}
                  </div>
                </div>

                {/* Submit */}
                <div className="flex flex-col gap-4 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="flex items-center gap-2 text-xs leading-4 text-body">
                    <img
                      src={shieldCheckIcon}
                      alt=""
                      className="h-[15px] w-3"
                    />
                    No upfront payment required • Free cancellation anytime
                  </p>
                  <Button
                    type="submit"
                    disabled={form.formState.isSubmitting}
                    className="h-auto gap-2 rounded-3xl px-8 py-3.5 text-sm leading-5 font-bold shadow-md"
                  >
                    <MaskIcon
                      src={checkCircleOutlineIcon}
                      className="size-[13.333px]"
                    />
                    {form.formState.isSubmitting
                      ? "Booking…"
                      : "Confirm Appointment"}
                  </Button>
                </div>
              </form>
            )}
          </div>

          {/* Side info */}
          <aside className="flex flex-col gap-4 lg:col-span-4">
            <div className="flex flex-col gap-4 rounded-[32px] border border-primary/20 bg-brand-soft p-[25px] shadow-xs">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-2xl bg-primary">
                  <MaskIcon
                    src={spaSmallIcon}
                    className="size-[16.667px] text-primary-foreground"
                  />
                </span>
                <span className="flex flex-col">
                  <span className="font-heading text-base leading-6 font-bold text-foreground">
                    Fear-Free Promise
                  </span>
                  <span className="text-xs leading-4 font-medium text-primary">
                    Certified Gentle Care
                  </span>
                </span>
              </div>
              <ul className="flex flex-col gap-2.5">
                {promises.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-xs leading-4 text-body"
                  >
                    <img
                      src={checkCircleSmallIcon}
                      alt=""
                      className="size-[13.333px] shrink-0"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-3 rounded-[32px] border border-border/70 bg-card p-[25px] shadow-xs">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-2xl bg-[#fef2f2] dark:bg-red-500/15">
                  <img
                    src={asteriskSmallIcon}
                    alt=""
                    className="h-[15px] w-[14.417px]"
                  />
                </span>
                <span className="flex flex-col">
                  <span className="font-heading text-sm leading-5 font-bold text-foreground">
                    Need Immediate Care?
                  </span>
                  <span className="text-xs leading-4 font-semibold text-[#dc2626] dark:text-red-400">
                    Emergency Triage 24/7
                  </span>
                </span>
              </div>
              <p className="text-xs leading-[19.5px] text-body">
                If your pet ingested toxic matter or experienced sudden trauma,
                skip the form and dial our priority line immediately.
              </p>
              <a
                href="tel:+18007386742"
                className="flex items-center justify-center gap-2 rounded-2xl bg-[#f1ecf3] px-4 py-3 text-xs leading-4 font-bold text-primary transition-colors hover:bg-brand-soft dark:bg-muted"
              >
                <MaskIcon src={phoneSmallIcon} className="size-3" />
                Call (800) PET-OPIA Now
              </a>
            </div>
          </aside>
        </div>
      </div>
    </section>
  )
}
