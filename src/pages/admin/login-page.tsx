import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { EyeIcon, EyeOffIcon, Loader2Icon, LockIcon } from "lucide-react"
import { Link } from "react-router"
import { z } from "zod"

import { useAuth } from "@/auth/auth-provider"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { AuthError } from "@/services"
import petopiaMark from "@/assets/brand/petopia-mark.png"

const loginSchema = z.object({
  email: z.email({ error: "Enter a valid email address" }),
  password: z.string().min(1, { error: "Enter your password" }),
  remember: z.boolean(),
})

type LoginValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  useDocumentTitle("Sign in")
  const { login } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", remember: true },
  })

  // On success GuestOnly sees the new session and redirects to `?redirect=`.
  const onSubmit = async (values: LoginValues) => {
    setFormError(null)
    try {
      await login(values)
    } catch (err) {
      setFormError(
        err instanceof AuthError
          ? err.message
          : "Something went wrong. Please try again."
      )
      form.setValue("password", "")
      form.setFocus("password")
    }
  }

  const submitting = form.formState.isSubmitting

  return (
    <div className="relative flex min-h-svh items-center justify-center bg-section px-4 py-12 font-jakarta">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(ellipse_at_top,var(--glow),transparent_70%)]"
      />
      <ThemeToggle className="absolute top-4 right-4" />

      <main className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Link to="/" aria-label="Back to Petopia website">
            <img src={petopiaMark} alt="" className="h-12 w-auto" />
          </Link>
          <div>
            <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground">
              Staff sign in
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage appointments and bookings
            </p>
          </div>
        </div>

        <form
          noValidate
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-5 rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8"
        >
          {formError && (
            <div
              role="alert"
              className="rounded-xl bg-destructive/10 px-3.5 py-2.5 text-sm font-medium text-destructive"
            >
              {formError}
            </div>
          )}

          <Controller
            control={form.control}
            name="email"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="login-email">Email</FieldLabel>
                <Input
                  {...field}
                  id="login-email"
                  type="email"
                  autoComplete="username"
                  autoFocus
                  placeholder="you@petopia.com"
                  aria-invalid={fieldState.invalid}
                  className="h-11 rounded-xl"
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="password"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="login-password">Password</FieldLabel>
                <div className="relative">
                  <Input
                    {...field}
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    aria-invalid={fieldState.invalid}
                    className="h-11 rounded-xl pr-11"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    className="absolute top-1/2 right-1.5 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </Button>
                </div>
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="remember"
            render={({ field }) => (
              <Field orientation="horizontal" className="gap-2.5">
                <Checkbox
                  id="login-remember"
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                />
                <FieldLabel htmlFor="login-remember" className="font-normal">
                  Keep me signed in for 7 days
                </FieldLabel>
              </Field>
            )}
          />

          <Button
            type="submit"
            disabled={submitting}
            className="h-11 rounded-xl text-sm font-semibold"
          >
            {submitting ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <LockIcon />
            )}
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        {import.meta.env.DEV && (
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Demo login: <code>admin@petopia.com</code> /{" "}
            <code>petopia123</code>
          </p>
        )}
      </main>
    </div>
  )
}
