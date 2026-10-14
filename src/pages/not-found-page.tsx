import { Link } from "react-router"

import { buttonVariants } from "@/components/ui/button"
import petopiaMark from "@/assets/brand/petopia-mark.png"

export default function NotFoundPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-section px-4 text-center font-jakarta">
      <img src={petopiaMark} alt="" className="h-12 w-auto" />
      <p className="text-sm font-bold tracking-wide text-primary uppercase">404</p>
      <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground">
        This page wandered off
      </h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        The page you're looking for doesn't exist or has moved.
      </p>
      <Link to="/" className={buttonVariants({ size: "lg" })}>
        Back to home
      </Link>
    </main>
  )
}
