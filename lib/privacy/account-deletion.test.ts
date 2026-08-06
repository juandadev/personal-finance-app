import { describe, expect, test } from "bun:test"

import {
  ACCOUNT_DELETION_CONFIRMATION,
  accountDeletionSchema,
  requiresCurrentPassword,
  runAccountDeletion,
} from "@/lib/privacy/account-deletion"

function makeDependencies() {
  return {
    deleteAuthUser: async () => true,
    deleteFinanceProfile: async () => {},
    getCurrentUser: async () => ({
      email: "person@example.com",
      id: "user-1",
    }),
    listProviderIds: async () => [],
    revokeOtherSessions: async () => {},
    signOut: async () => {},
    verifyCurrentPassword: async () => true,
  }
}

describe("account deletion confirmation", () => {
  test("requires the exact destructive confirmation phrase", () => {
    expect(
      accountDeletionSchema.safeParse({
        confirmationPhrase: ACCOUNT_DELETION_CONFIRMATION,
        currentPassword: "",
      }).success,
    ).toBe(true)

    expect(
      accountDeletionSchema.safeParse({
        confirmationPhrase: "delete my account",
        currentPassword: "",
      }).success,
    ).toBe(false)
  })

  test("detects email and password accounts", () => {
    expect(requiresCurrentPassword(["google", "credential"])).toBe(true)
    expect(requiresCurrentPassword(["google"])).toBe(false)
  })
})

describe("runAccountDeletion", () => {
  test("rejects an unauthenticated request before any deletion", async () => {
    let financeDeleteCalled = false
    let authDeleteCalled = false
    const dependencies = makeDependencies()

    const result = await runAccountDeletion(
      {
        confirmationPhrase: ACCOUNT_DELETION_CONFIRMATION,
        currentPassword: "",
      },
      {
        ...dependencies,
        getCurrentUser: async () => null,
        deleteFinanceProfile: async () => {
          financeDeleteCalled = true
        },
        deleteAuthUser: async () => {
          authDeleteCalled = true
          return true
        },
      },
    )

    expect(result.ok).toBe(false)
    expect(financeDeleteCalled).toBe(false)
    expect(authDeleteCalled).toBe(false)
  })

  test("stops before deletion when confirmation is invalid", async () => {
    let financeDeleteCalled = false
    const dependencies = makeDependencies()

    const result = await runAccountDeletion(
      {
        confirmationPhrase: "DELETE ACCOUNT",
        currentPassword: "",
      },
      {
        ...dependencies,
        deleteFinanceProfile: async () => {
          financeDeleteCalled = true
        },
      },
    )

    expect(result.ok).toBe(false)
    expect(financeDeleteCalled).toBe(false)
    expect(
      result.ok ? undefined : result.fieldErrors?.confirmationPhrase?.[0],
    ).toContain(ACCOUNT_DELETION_CONFIRMATION)
  })

  test("retries auth deletion after repeating the idempotent finance purge", async () => {
    const dependencies = makeDependencies()
    let authAttempts = 0
    let financeAttempts = 0
    const input = {
      confirmationPhrase: ACCOUNT_DELETION_CONFIRMATION,
      currentPassword: "",
    }
    const retryingDependencies = {
      ...dependencies,
      deleteFinanceProfile: async () => {
        financeAttempts += 1
      },
      deleteAuthUser: async () => {
        authAttempts += 1
        return authAttempts > 1
      },
    }

    const firstResult = await runAccountDeletion(input, retryingDependencies)
    const retryResult = await runAccountDeletion(input, retryingDependencies)

    expect(firstResult.ok).toBe(false)
    expect(firstResult.message).toContain("finance data was deleted")
    expect(retryResult.ok).toBe(true)
    expect(financeAttempts).toBe(2)
    expect(authAttempts).toBe(2)
  })
})
