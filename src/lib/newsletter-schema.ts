import { z } from "zod"

export const newsletterSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { error: "Enter your email" })
    .pipe(z.email({ error: "Enter a valid email address" })),
})

export type NewsletterFormValues = z.infer<typeof newsletterSchema>
