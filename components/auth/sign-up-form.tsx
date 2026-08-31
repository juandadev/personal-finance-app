"use client"

import { useActionState, type FormEvent } from "react"
import { z } from "zod"

import { signUpWithEmail } from "@/app/(auth)/sign-up/actions"
import {
  AuthField,
  AuthPasswordField,
  AuthSubmitButton,
} from "@/components/auth/auth-page-shell"
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button"
import { FormStatusMessage } from "@/components/ui/form"
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_MIN_LENGTH_MESSAGE,
} from "@/lib/auth/password-policy"
import { useStandardForm } from "@/lib/forms/use-standard-form"

const signUpFormSchema = z.object({
  name: z.string().trim().min(1, "Enter your name."),
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(PASSWORD_MIN_LENGTH, PASSWORD_MIN_LENGTH_MESSAGE),
})

type SignUpFormValues = z.input<typeof signUpFormSchema>

export function SignUpForm() {
  const [actionState, formAction, isActionPending] = useActionState(
    signUpWithEmail,
    null,
  )
  const standardForm = useStandardForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
    } satisfies SignUpFormValues,
    schema: signUpFormSchema,
    onSubmit: () => undefined,
  })

  const nameError =
    standardForm.fieldErrors.name ?? actionState?.fieldErrors?.name?.[0]
  const emailError =
    standardForm.fieldErrors.email ?? actionState?.fieldErrors?.email?.[0]
  const passwordError =
    standardForm.fieldErrors.password ?? actionState?.fieldErrors?.password?.[0]
  const statusMessage = standardForm.status?.message ?? actionState?.message

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget)
    const raw = {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    }

    standardForm.setValue("name", raw.name)
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
      aria-label="Sign-up form"
      method="post"
      action={formAction}
      onSubmit={handleSubmit}
    >
      <GoogleSignInButton />

      <standardForm.form.Field name="name">
        {(field) => (
          <AuthField
            id="name"
            name="name"
            type="text"
            label="Name"
            autoComplete="name"
            value={field.state.value}
            onChange={(event) =>
              standardForm.setValue("name", event.target.value)
            }
            onBlur={field.handleBlur}
            error={nameError}
          />
        )}
      </standardForm.form.Field>
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
            label="Create Password"
            autoComplete="new-password"
            helperText={`Passwords must be at least ${PASSWORD_MIN_LENGTH} characters`}
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
        {isActionPending ? "Creating account..." : "Create Account"}
      </AuthSubmitButton>
    </form>
  )
}
