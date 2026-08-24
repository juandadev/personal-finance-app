"use client"

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
  const standardForm = useStandardForm({
    defaultValues: {
      email: "",
      password: "",
    } satisfies LoginFormValues,
    schema: loginFormSchema,
    onSubmit: async ({ applyActionResult, value }) => {
      const formData = new FormData()
      formData.set("email", value.email)
      formData.set("password", value.password)

      const result = await signInWithEmail(null, formData)

      if (result) {
        applyActionResult({
          ok: false,
          message: result.message,
          fieldErrors: result.fieldErrors,
        })
      }
    },
  })

  return (
    <form
      className="space-y-4"
      aria-label="Login form"
      onSubmit={standardForm.handleSubmit}
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
            value={field.state.value}
            onChange={(event) =>
              standardForm.setValue("email", event.target.value)
            }
            onBlur={field.handleBlur}
            error={standardForm.fieldErrors.email}
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
            error={standardForm.fieldErrors.password}
          />
        )}
      </standardForm.form.Field>
      {standardForm.status?.message ? (
        <FormStatusMessage variant={standardForm.status.variant}>
          {standardForm.status.message}
        </FormStatusMessage>
      ) : null}
      <standardForm.form.Subscribe selector={(state) => state.isSubmitting}>
        {(isSubmitting) => (
          <AuthSubmitButton disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Login"}
          </AuthSubmitButton>
        )}
      </standardForm.form.Subscribe>
    </form>
  )
}
