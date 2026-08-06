"use client"

import { useState } from "react"
import { GoogleLogoIcon } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { FormStatusMessage } from "@/components/ui/form"
import { authClient } from "@/lib/auth/client"

export function GoogleSignInButton() {
  const [isPending, setIsPending] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleGoogleSignIn() {
    setIsPending(true)
    setErrorMessage(null)

    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: window.location.origin,
        errorCallbackURL: `${window.location.origin}/login`,
      })

      if (result.error) {
        setErrorMessage(
          "Google sign-in could not be started. Try again in a moment.",
        )
        setIsPending(false)
      }
    } catch {
      setErrorMessage(
        "Google sign-in could not be started. Check your connection and try again.",
      )
      setIsPending(false)
    }
  }

  return (
    <div className="space-y-4">
      <Button
        type="button"
        variant="secondary"
        size="finance-submit"
        disabled={isPending}
        aria-busy={isPending}
        onClick={handleGoogleSignIn}
      >
        <GoogleLogoIcon className="size-5" weight="fill" aria-hidden="true" />
        {isPending ? "Opening Google..." : "Continue With Google"}
      </Button>

      {errorMessage ? (
        <FormStatusMessage variant="error">{errorMessage}</FormStatusMessage>
      ) : null}

      <div className="flex items-center gap-4" aria-hidden="true">
        <div className="bg-border h-px flex-1" />
        <span className="text-muted-foreground text-xs">or use email</span>
        <div className="bg-border h-px flex-1" />
      </div>
    </div>
  )
}
