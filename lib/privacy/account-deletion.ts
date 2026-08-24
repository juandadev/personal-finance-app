import { z } from "zod"

import type { StandardActionResult } from "@/lib/forms/validation"

export const ACCOUNT_DELETION_CONFIRMATION = "DELETE MY ACCOUNT"
export const EMAIL_PASSWORD_PROVIDER_ID = "credential"

export const accountDeletionSchema = z.object({
  confirmationPhrase: z
    .string()
    .trim()
    .refine((value): boolean => value === ACCOUNT_DELETION_CONFIRMATION, {
      message: `Type ${ACCOUNT_DELETION_CONFIRMATION} exactly.`,
    }),
  currentPassword: z.string().max(256, "The password is too long.").optional(),
})

export type AccountDeletionInput = z.infer<typeof accountDeletionSchema>

interface CurrentAccountUser {
  email: string
  id: string
}

interface AccountDeletionDependencies {
  deleteAuthUser: (currentPassword?: string) => Promise<boolean>
  deleteFinanceProfile: (userId: string) => Promise<void>
  getCurrentUser: () => Promise<CurrentAccountUser | null>
  listProviderIds: () => Promise<string[]>
  revokeOtherSessions: () => Promise<void>
  signOut: () => Promise<void>
  verifyCurrentPassword: (email: string, password: string) => Promise<boolean>
}

export function requiresCurrentPassword(providerIds: string[]) {
  return providerIds.includes(EMAIL_PASSWORD_PROVIDER_ID)
}

export async function runAccountDeletion(
  input: unknown,
  dependencies: AccountDeletionDependencies,
): Promise<StandardActionResult> {
  const user = await dependencies.getCurrentUser()

  if (!user) {
    return {
      ok: false,
      message: "You must be logged in to delete your account.",
    }
  }

  const parsed = accountDeletionSchema.safeParse(input)

  if (!parsed.success) {
    return {
      ok: false,
      message: "Check the highlighted fields and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  let providerIds: string[]

  try {
    providerIds = await dependencies.listProviderIds()
  } catch {
    return {
      ok: false,
      message: "We could not verify your account. Try again.",
    }
  }

  const passwordRequired = requiresCurrentPassword(providerIds)
  const currentPassword = parsed.data.currentPassword?.trim() || undefined

  if (passwordRequired && !currentPassword) {
    return {
      ok: false,
      message: "Enter your current password to delete this account.",
      fieldErrors: {
        currentPassword: ["Enter your current password."],
      },
    }
  }

  if (passwordRequired && currentPassword) {
    let passwordIsValid: boolean

    try {
      passwordIsValid = await dependencies.verifyCurrentPassword(
        user.email,
        currentPassword,
      )
    } catch {
      passwordIsValid = false
    }

    if (!passwordIsValid) {
      return {
        ok: false,
        message: "The current password is incorrect.",
        fieldErrors: {
          currentPassword: ["Enter your current password again."],
        },
      }
    }
  }

  try {
    await dependencies.revokeOtherSessions()
  } catch {
    return {
      ok: false,
      message: "We could not secure your other sessions. Try again.",
    }
  }

  try {
    await dependencies.deleteFinanceProfile(user.id)
  } catch {
    return {
      ok: false,
      message: "We could not delete your finance data. Try again.",
    }
  }

  let authUserDeleted: boolean

  try {
    authUserDeleted = await dependencies.deleteAuthUser(currentPassword)
  } catch {
    authUserDeleted = false
  }

  if (!authUserDeleted) {
    return {
      ok: false,
      message:
        "Your finance data was deleted, but your sign-in account still needs removal. Keep this page open and try Delete Account again.",
    }
  }

  try {
    await dependencies.signOut()
  } catch {
    // Neon Auth user deletion invalidates the account and its sessions. This
    // best-effort call only clears any remaining local session cookie.
  }

  return {
    ok: true,
    message: "Your account and finance data were deleted.",
  }
}
