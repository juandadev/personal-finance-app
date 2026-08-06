"use server"

import {
  requiresCurrentPassword,
  runAccountDeletion,
  type AccountDeletionInput,
} from "@/lib/privacy/account-deletion"
import { auth } from "@/lib/auth/server"
import { deleteFinanceProfile } from "@/lib/privacy/server"

async function listCurrentProviderIds() {
  const result = await auth.listAccounts()

  if (result.error) {
    throw new Error("Unable to load account providers.")
  }

  return (result.data ?? []).map((account) => account.providerId)
}

export async function getCurrentAccountRequiresPassword() {
  try {
    return requiresCurrentPassword(await listCurrentProviderIds())
  } catch {
    return true
  }
}

export async function deleteCurrentAccount(input: AccountDeletionInput) {
  return runAccountDeletion(input, {
    getCurrentUser: async () => {
      const { data: session } = await auth.getSession()
      const user = session?.user

      return user?.id && user.email
        ? {
            email: user.email,
            id: user.id,
          }
        : null
    },
    listProviderIds: listCurrentProviderIds,
    verifyCurrentPassword: async (email, password) => {
      const result = await auth.signIn.email({ email, password })
      return !result.error
    },
    revokeOtherSessions: async () => {
      const result = await auth.revokeOtherSessions()

      if (result.error) {
        throw new Error("Unable to revoke other sessions.")
      }
    },
    deleteFinanceProfile: async (userId) => {
      await deleteFinanceProfile(userId)
    },
    deleteAuthUser: async (currentPassword) => {
      const result = await auth.deleteUser(
        currentPassword ? { password: currentPassword } : undefined,
      )

      return !result.error && Boolean(result.data?.success)
    },
    signOut: async () => {
      await auth.signOut()
    },
  })
}
