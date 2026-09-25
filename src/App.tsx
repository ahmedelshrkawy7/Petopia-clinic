import { HeroSection } from "@/components/hero-section"
import { Navbar } from "@/components/navbar"
import { ServicesSection } from "@/components/services-section"
import { StatsSection } from "@/components/stats-section"

export function App() {
  return (
    <div className="min-h-svh">
      <Navbar />
      <main>
        <HeroSection />
        <ServicesSection />
        <StatsSection />
      </main>
    </div>
  )
}

export default App
