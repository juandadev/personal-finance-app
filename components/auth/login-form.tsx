"use client"

import { useActionState } from "react"

import { signInWithEmail } from "@/app/(auth)/login/actions"
import {
  AuthField,
  AuthPasswordField,
  AuthStatusMessage,
  AuthSubmitButton,
} from "@/components/auth/auth-page-shell"

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(signInWithEmail, null)

  return (
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
  )
}
