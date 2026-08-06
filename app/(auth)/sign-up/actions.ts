"use server"

import { redirect } from "next/navigation"
import { z } from "zod"

import { auth } from "@/lib/auth/server"
import type { AuthFormState } from "@/lib/auth/form-state"
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_MIN_LENGTH_MESSAGE,
} from "@/lib/auth/password-policy"
import { logServerError } from "@/lib/observability/server-logger"

const signUpSchema = z.object({
  name: z.string().trim().min(1, "Enter your name."),
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(PASSWORD_MIN_LENGTH, PASSWORD_MIN_LENGTH_MESSAGE),
})

export async function signUpWithEmail(
  _previousState: AuthFormState | null,
  formData: FormData,
): Promise<AuthFormState | null> {
  const parsed = signUpSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  })

  if (!parsed.success) {
    return {
      message: "Check the highlighted fields and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  let result: Awaited<ReturnType<typeof auth.signUp.email>>

  try {
    result = await auth.signUp.email(parsed.data)
  } catch (error) {
    logServerError("email_sign_up_request_failed", error)

    return {
      message:
        "We couldn't reach the server. Check your connection and try again.",
    }
  }

  if (result.error) {
    return {
      message:
        "We could not create this account. Confirm your invitation and verification details, then try again.",
    }
  }

  redirect("/verify-email?sent=1")
}
