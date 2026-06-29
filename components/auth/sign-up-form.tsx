"use client"

import { useActionState } from "react"

import { signUpWithEmail } from "@/app/(auth)/sign-up/actions"
import {
  AuthField,
  AuthPasswordField,
  AuthStatusMessage,
  AuthSubmitButton,
} from "@/components/auth/auth-page-shell"
import { OAuthButtons } from "@/components/auth/oauth-buttons"

export function SignUpForm() {
  const [state, formAction, isPending] = useActionState(signUpWithEmail, null)

  return (
    <div className="space-y-6">
      <form className="space-y-4" aria-label="Sign-up form" action={formAction}>
        <AuthField
          id="name"
          name="name"
          type="text"
          label="Name"
          autoComplete="name"
          disabled={isPending}
          error={state?.fieldErrors?.name?.[0]}
        />
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
          label="Create Password"
          autoComplete="new-password"
          helperText="Passwords must be at least 8 characters"
          disabled={isPending}
          error={state?.fieldErrors?.password?.[0]}
        />
        {state?.message ? (
          <AuthStatusMessage variant="error">{state.message}</AuthStatusMessage>
        ) : null}
        <AuthSubmitButton disabled={isPending}>
          {isPending ? "Creating account..." : "Create Account"}
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
