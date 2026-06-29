"use server"

import { redirect } from "next/navigation"
import { z } from "zod"

import { auth } from "@/lib/auth/server"
import type { AuthFormState } from "@/lib/auth/form-state"

const signUpSchema = z.object({
  name: z.string().trim().min(1, "Enter your name."),
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Create a password with at least 8 characters."),
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

  const { error } = await auth.signUp.email(parsed.data)

  if (error) {
    return {
      message:
        error.message ||
        "We could not create your account. Try again in a moment.",
    }
  }

  redirect("/")
}
