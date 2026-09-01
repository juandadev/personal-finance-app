import { describe, expect, test } from "bun:test"

import {
  hasAdminEmailPrivileges,
  isAdminUserAccess,
  isLocalDevelopmentEnvironment,
} from "@/lib/admin/access-policy"

describe("admin access policy", () => {
  test("treats only development as a local environment", () => {
    expect(isLocalDevelopmentEnvironment("development")).toBe(true)
    expect(isLocalDevelopmentEnvironment("production")).toBe(false)
    expect(isLocalDevelopmentEnvironment("test")).toBe(false)
    expect(isLocalDevelopmentEnvironment(undefined)).toBe(false)
  })

  test("matches admin emails after trimming and lowercasing", () => {
    expect(
      hasAdminEmailPrivileges(
        "  Operator@Example.com ",
        "operator@example.com",
      ),
    ).toBe(true)
  })

  test("denies access when the privileged email is missing", () => {
    expect(hasAdminEmailPrivileges("operator@example.com", undefined)).toBe(
      false,
    )
    expect(hasAdminEmailPrivileges("operator@example.com", "   ")).toBe(false)
  })

  test("denies access when the session email is missing", () => {
    expect(hasAdminEmailPrivileges(undefined, "operator@example.com")).toBe(
      false,
    )
  })

  test("requires both local development and the privileged email", () => {
    expect(
      isAdminUserAccess({
        adminEmail: "operator@example.com",
        nodeEnv: "development",
        userEmail: "operator@example.com",
      }),
    ).toBe(true)

    expect(
      isAdminUserAccess({
        adminEmail: "operator@example.com",
        nodeEnv: "production",
        userEmail: "operator@example.com",
      }),
    ).toBe(false)

    expect(
      isAdminUserAccess({
        adminEmail: "operator@example.com",
        nodeEnv: "development",
        userEmail: "someone-else@example.com",
      }),
    ).toBe(false)
  })
})
