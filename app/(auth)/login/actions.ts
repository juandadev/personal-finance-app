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
  logSecurityEvent,
  logServerError,
} from "@/lib/observability/server-logger"

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
})

export async function signInWithEmail(
  previousState: AuthFormState | FormData | null,
  formData?: FormData,
): Promise<AuthFormState | null> {
  const data = formDataFromActionArgs(previousState, formData)

  if (!data) {
    return {
      message: "We could not sign you in. Check your details and try again.",
    }
  }

  const parsed = loginSchema.safeParse({
    email: data.get("email"),
    password: data.get("password"),
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
    const origin = await getRequestOrigin()
    const status = result.error.status
    const code =
      "code" in result.error && typeof result.error.code === "string"
        ? result.error.code
        : null

    logSecurityEvent("email_sign_in_rejected", {
      status,
      code,
    })

    if (status === 403 || code === "INVALID_ORIGIN") {
      return {
        message: blockedAuthOriginMessage(origin),
      }
    }

    return {
      message: "We could not sign you in. Check your details and try again.",
    }
  }

  redirect("/")
}
