"use server"

import { redirect } from "next/navigation"
import { z } from "zod"

import { formDataFromActionArgs } from "@/lib/auth/action-form-data"
import type { AuthFormState } from "@/lib/auth/form-state"
import {
  blockedAuthOriginMessage,
  getRequestOrigin,
} from "@/lib/auth/request-origin"
import { auth } from "@/lib/auth/server"
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_MIN_LENGTH_MESSAGE,
} from "@/lib/auth/password-policy"
import {
  logSecurityEvent,
  logServerError,
} from "@/lib/observability/server-logger"

const signUpSchema = z.object({
  name: z.string().trim().min(1, "Enter your name."),
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(PASSWORD_MIN_LENGTH, PASSWORD_MIN_LENGTH_MESSAGE),
})

export async function signUpWithEmail(
  previousState: AuthFormState | FormData | null,
  formData?: FormData,
): Promise<AuthFormState | null> {
  const data = formDataFromActionArgs(previousState, formData)

  if (!data) {
    return {
      message:
        "We could not create this account. Confirm your invitation and verification details, then try again.",
    }
  }

  const parsed = signUpSchema.safeParse({
    name: data.get("name"),
    email: data.get("email"),
    password: data.get("password"),
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
    const origin = await getRequestOrigin()
    const status = result.error.status
    const code =
      "code" in result.error && typeof result.error.code === "string"
        ? result.error.code
        : null

    logSecurityEvent("email_sign_up_rejected", {
      status,
      code,
    })

    if (status === 403 || code === "INVALID_ORIGIN") {
      return {
        message: blockedAuthOriginMessage(origin),
      }
    }

    return {
      message:
        "We could not create this account. Confirm your invitation and verification details, then try again.",
    }
  }

  redirect("/verify-email?sent=1")
}
