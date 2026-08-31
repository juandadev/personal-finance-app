"use client"

import { useActionState, type FormEvent } from "react"
import { z } from "zod"

import { signInWithEmail } from "@/app/(auth)/login/actions"
import {
  AuthField,
  AuthPasswordField,
  AuthSubmitButton,
} from "@/components/auth/auth-page-shell"
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button"
import { FormStatusMessage } from "@/components/ui/form"
import { useStandardForm } from "@/lib/forms/use-standard-form"

const loginFormSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
})

type LoginFormValues = z.input<typeof loginFormSchema>

export function LoginForm() {
  const [actionState, formAction, isActionPending] = useActionState(
    signInWithEmail,
    null,
  )
  const standardForm = useStandardForm({
    defaultValues: {
      email: "",
      password: "",
    } satisfies LoginFormValues,
    schema: loginFormSchema,
    onSubmit: () => undefined,
  })

  const emailError =
    standardForm.fieldErrors.email ?? actionState?.fieldErrors?.email?.[0]
  const passwordError =
    standardForm.fieldErrors.password ?? actionState?.fieldErrors?.password?.[0]
  const statusMessage = standardForm.status?.message ?? actionState?.message

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget)
    const raw = {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    }

    standardForm.setValue("email", raw.email)
    standardForm.setValue("password", raw.password)

    const parsed = standardForm.validateValues(raw)

    if (!parsed.success) {
      event.preventDefault()
      event.stopPropagation()
    }
  }

  return (
    <form
      className="space-y-4"
      aria-label="Login form"
      method="post"
      action={formAction}
      onSubmit={handleSubmit}
    >
      <GoogleSignInButton />

      <standardForm.form.Field name="email">
        {(field) => (
          <AuthField
            id="email"
            name="email"
            type="email"
            label="Email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={field.state.value}
            onChange={(event) =>
              standardForm.setValue("email", event.target.value)
            }
            onBlur={field.handleBlur}
            error={emailError}
          />
        )}
      </standardForm.form.Field>
      <standardForm.form.Field name="password">
        {(field) => (
          <AuthPasswordField
            id="password"
            name="password"
            label="Password"
            autoComplete="current-password"
            value={field.state.value}
            onChange={(event) =>
              standardForm.setValue("password", event.target.value)
            }
            onBlur={field.handleBlur}
            error={passwordError}
          />
        )}
      </standardForm.form.Field>
      {statusMessage ? (
        <FormStatusMessage variant={standardForm.status?.variant ?? "error"}>
          {statusMessage}
        </FormStatusMessage>
      ) : null}
      <AuthSubmitButton disabled={isActionPending}>
        {isActionPending ? "Signing in..." : "Login"}
      </AuthSubmitButton>
    </form>
  )
}
