import { AdvantageSection } from "@/components/advantage-section"
import { BookingSection } from "@/components/booking-section"
import { CtaSection } from "@/components/cta-section"
import { HeroSectionPlayful } from "@/components/hero-section-playful"
import { Navbar } from "@/components/navbar"
import { PromoBanner } from "@/components/promo-banner"
import { ServicesSection } from "@/components/services-section"
import { SiteFooter } from "@/components/site-footer"
import { StatsSection } from "@/components/stats-section"
import { TestimonialsSection } from "@/components/testimonials-section"

export function App() {
  return (
    <div className="min-h-svh">
      <Navbar />
      <main>
        <HeroSectionPlayful />
        <ServicesSection />
        <StatsSection />
        <AdvantageSection />
        <PromoBanner />
        <TestimonialsSection />
        <BookingSection />
        <CtaSection className="pt-0 pb-24" />
      </main>
      <SiteFooter />
    </div>
  )
}

export default App
