import type { AuthFormState } from "@/lib/auth/form-state"

export function formDataFromActionArgs(
  previousState: AuthFormState | FormData | null,
  formData?: FormData,
) {
  if (previousState instanceof FormData) {
    return previousState
  }

  return formData ?? null
}
