import { cn } from "cn"

import elenaRodriguez from "@/assets/testimonials/elena-rodriguez.jpg"
import marcusChen from "@/assets/testimonials/marcus-chen.jpg"
import sarahJenkins from "@/assets/testimonials/sarah-jenkins.jpg"
import starIcon from "@/assets/icons/star-large.svg"

const testimonials = [
  {
    quote:
      "Milo used to tremble whenever we pulled up to our previous vet. At Petopia, the lobby has soothing music and tasty liver treats. He actually wags his tail right through the door!",
    name: "Sarah Jenkins",
    pet: "Pet Parent of Milo • Golden Retriever",
    photo: sarahJenkins,
  },
  {
    quote:
      "When Luna swallowed a ribbon at 11 PM on Sunday, Petopia’s 24/7 urgent team handled everything seamlessly with endoscopy. They saved her life without painful invasive surgery.",
    name: "Marcus Chen",
    pet: "Pet Parent of Luna • British Shorthair",
    photo: marcusChen,
    featured: true,
  },
  {
    quote:
      "The transparent pricing and digital portal make managing appointments and refills effortless. Plus their gentle dental cleaning made a night-and-day difference for Toby!",
    name: "Elena Rodriguez",
    pet: "Pet Parent of Toby • Cockapoo",
    photo: elenaRodriguez,
  },
]

export function TestimonialsSection({ className }: { className?: string }) {
  return (
    <section id="reviews" className={cn("py-24 font-jakarta", className)}>
      <div className="page-container flex flex-col items-center gap-14">
        <div className="flex max-w-[672px] flex-col items-center gap-2 text-center">
          <span className="rounded-full bg-[#e4dfff] px-3.5 py-1 text-xs leading-4 font-bold tracking-[0.6px] text-primary uppercase dark:bg-brand-soft">
            Loved by pets &amp; owners
          </span>
          <h2 className="pt-1 font-heading text-[28px] leading-9 font-extrabold tracking-[-0.7px] text-foreground sm:text-4xl sm:leading-10 sm:tracking-[-0.9px]">
            Stories From Our Happy Pet Parents
          </h2>
          <p className="text-base leading-6 text-body">
            See why thousands of pet parents trust Petopia as their lifetime
            animal health partner.
          </p>
        </div>

        <div className="grid w-full gap-6 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t) => (
            <figure
              key={t.name}
              className={cn(
                "flex flex-col justify-between rounded-[32px] border bg-card/85 p-[29px] shadow-xs backdrop-blur-md",
                t.featured ? "border-primary/30" : "border-border/70"
              )}
            >
              <div className="flex flex-col gap-4 pb-6">
                <div
                  className="flex gap-1"
                  role="img"
                  aria-label="Rated 5 out of 5"
                >
                  {Array.from({ length: 5 }, (_, i) => (
                    <img
                      key={i}
                      src={starIcon}
                      alt=""
                      className="h-[14.25px] w-[15px]"
                    />
                  ))}
                </div>
                <blockquote className="text-sm leading-[22.75px] font-medium text-foreground">
                  “{t.quote}”
                </blockquote>
              </div>

              <figcaption className="flex items-center gap-3 border-t border-border/70 pt-[17px]">
                <img
                  src={t.photo}
                  alt={t.name}
                  className="size-11 rounded-full object-cover ring-2 ring-primary/20"
                />
                <span className="flex flex-col">
                  <span className="font-heading text-sm leading-5 font-bold text-foreground">
                    {t.name}
                  </span>
                  <span className="text-xs leading-4 font-semibold text-primary">
                    {t.pet}
                  </span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
