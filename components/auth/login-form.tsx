"use client"

import { useActionState } from "react"

import { signInWithEmail } from "@/app/(auth)/login/actions"
import {
  AuthField,
  AuthPasswordField,
  AuthStatusMessage,
  AuthSubmitButton,
} from "@/components/auth/auth-page-shell"
import { OAuthButtons } from "@/components/auth/oauth-buttons"

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(signInWithEmail, null)

  return (
    <div className="space-y-6">
      <form className="space-y-4" aria-label="Login form" action={formAction}>
        <AuthField
          id="email"
          name="email"
          type="email"
          label="Email"
          autoComplete="email"
          disabled={isPending}
          error={state?.fieldErrors?.email?.[0]}
        />
        <AuthPasswordField
          id="password"
          name="password"
          label="Password"
          autoComplete="current-password"
          disabled={isPending}
          error={state?.fieldErrors?.password?.[0]}
        />
        {state?.message ? (
          <AuthStatusMessage variant="error">{state.message}</AuthStatusMessage>
        ) : null}
        <AuthSubmitButton disabled={isPending}>
          {isPending ? "Signing in..." : "Login"}
        </AuthSubmitButton>
      </form>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="bg-border h-px flex-1" />
          <p className="text-muted-foreground text-xs font-bold">Or</p>
          <div className="bg-border h-px flex-1" />
        </div>
        <OAuthButtons />
      </div>
    </div>
  )
}
