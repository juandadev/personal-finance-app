"use client"

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
  const standardForm = useStandardForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
    } satisfies SignUpFormValues,
    schema: signUpFormSchema,
    onSubmit: async ({ applyActionResult, value }) => {
      const formData = new FormData()
      formData.set("name", value.name)
      formData.set("email", value.email)
      formData.set("password", value.password)

      const result = await signUpWithEmail(null, formData)

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
      aria-label="Sign-up form"
      onSubmit={standardForm.handleSubmit}
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
            error={standardForm.fieldErrors.name}
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
            label="Create Password"
            autoComplete="new-password"
            helperText={`Passwords must be at least ${PASSWORD_MIN_LENGTH} characters`}
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
            {isSubmitting ? "Creating account..." : "Create Account"}
          </AuthSubmitButton>
        )}
      </standardForm.form.Subscribe>
    </form>
  )
}
