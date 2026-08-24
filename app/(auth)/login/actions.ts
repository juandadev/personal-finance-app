"use server"

import { redirect } from "next/navigation"
import { z } from "zod"

import { auth } from "@/lib/auth/server"
import type { AuthFormState } from "@/lib/auth/form-state"
import { logServerError } from "@/lib/observability/server-logger"

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
})

export async function signInWithEmail(
  _previousState: AuthFormState | null,
  formData: FormData,
): Promise<AuthFormState | null> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  })

  if (!parsed.success) {
    return {
      message: "Check the highlighted fields and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  let result: Awaited<ReturnType<typeof auth.signIn.email>>

  try {
    result = await auth.signIn.email(parsed.data)
  } catch (error) {
    logServerError("email_sign_in_request_failed", error)

    return {
      message:
        "We couldn't reach the server. Check your connection and try again.",
    }
  }

  if (result.error) {
    return {
      message: "We could not sign you in. Check your details and try again.",
    }
  }

  redirect("/")
}
