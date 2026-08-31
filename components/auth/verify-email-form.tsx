"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"

import {
  AuthField,
  AuthStatusMessage,
  AuthSubmitButton,
} from "@/components/auth/auth-page-shell"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth/client"

const verificationSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code."),
})

export function VerifyEmailForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{
    code?: string
    email?: string
  }>({})

  async function handleVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)
    setFieldErrors({})

    const parsed = verificationSchema.safeParse({ email, code })

    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors
      setFieldErrors({
        email: errors.email?.[0],
        code: errors.code?.[0],
      })
      return
    }

    setIsVerifying(true)

    try {
      const result = await authClient.emailOtp.verifyEmail({
        email: parsed.data.email,
        otp: parsed.data.code,
      })

      if (result.error) {
        setMessage("The verification code is invalid or expired.")
        return
      }

      router.replace("/login?verification=complete")
      router.refresh()
    } catch {
      setMessage(
        "We could not verify your email. Check your connection and try again.",
      )
    } finally {
      setIsVerifying(false)
    }
  }

  async function handleResend() {
    const emailResult = z.string().trim().email().safeParse(email)

    if (!emailResult.success) {
      setFieldErrors({
        email: "Enter your email before requesting a new code.",
      })
      return
    }

    setIsResending(true)
    setMessage(null)

    try {
      const result = await authClient.sendVerificationEmail({
        email: emailResult.data,
        callbackURL: `${window.location.origin}/login?verification=complete`,
      })

      setMessage(
        result.error
          ? "We could not send a new code. Try again in a moment."
          : "If the account is eligible, a new verification code is on its way.",
      )
    } catch {
      setMessage(
        "We could not send a new code. Check your connection and try again.",
      )
    } finally {
      setIsResending(false)
    }
  }

  return (
    <form
      className="space-y-4"
      aria-label="Verify email form"
      method="post"
      onSubmit={handleVerify}
    >
      <AuthField
        id="verification-email"
        name="email"
        type="email"
        label="Email"
        autoComplete="email"
        value={email}
        error={fieldErrors.email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <AuthField
        id="verification-code"
        name="code"
        type="text"
        label="Verification Code"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        value={code}
        error={fieldErrors.code}
        helperText="Enter the 6-digit code. Codes expire after 15 minutes."
        onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
      />

      {message ? <AuthStatusMessage>{message}</AuthStatusMessage> : null}

      <AuthSubmitButton disabled={isVerifying || isResending}>
        {isVerifying ? "Verifying Email..." : "Verify Email"}
      </AuthSubmitButton>
      <Button
        type="button"
        variant="ghost"
        className="w-full"
        disabled={isVerifying || isResending}
        onClick={handleResend}
      >
        {isResending ? "Sending New Code..." : "Send a New Code"}
      </Button>
    </form>
  )
}
