import { HeroSection } from "@/components/hero-section"
import { Navbar } from "@/components/navbar"

export function App() {
  return (
    <div className="min-h-svh">
      <Navbar />
      <main>
        <HeroSection />
      </main>
    </div>
  )
}

export default App
