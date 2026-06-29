"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { AuthStatusMessage } from "@/components/auth/auth-page-shell"
import { authClient } from "@/lib/auth/client"

type OAuthProvider = "google"

const oauthProviders: Array<{ id: OAuthProvider; label: string }> = [
  { id: "google", label: "Continue with Google" },
]

export function OAuthButtons() {
  const [pendingProvider, setPendingProvider] = useState<OAuthProvider | null>(
    null,
  )
  const [error, setError] = useState("")

  const handleProviderSignIn = async (provider: OAuthProvider) => {
    setPendingProvider(provider)
    setError("")

    const { data, error } = await authClient.signIn.social({
      provider,
      callbackURL: "/",
      errorCallbackURL: "/login",
    })

    if (error) {
      setError(
        error.message ||
          "We could not start the provider sign-in flow. Try again.",
      )
      setPendingProvider(null)
      return
    }

    if (data?.url) {
      window.location.assign(data.url)
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {oauthProviders.map((provider) => (
          <Button
            key={provider.id}
            type="button"
            variant="outline"
            className="h-12"
            disabled={pendingProvider !== null}
            onClick={() => void handleProviderSignIn(provider.id)}
          >
            {pendingProvider === provider.id
              ? "Redirecting..."
              : provider.label}
          </Button>
        ))}
      </div>
      {error ? (
        <AuthStatusMessage variant="error">{error}</AuthStatusMessage>
      ) : null}
    </div>
  )
}
