import { describe, expect, test } from "bun:test"

import { isPrivilegedRuntimeRole } from "./runtime-role-policy"

const safeRole = {
  rolname: "finance_web",
  rolsuper: false,
  rolcreaterole: false,
  rolcreatedb: false,
  rolbypassrls: false,
}

describe("isPrivilegedRuntimeRole", () => {
  test("accepts a least-privilege runtime role", () => {
    expect(isPrivilegedRuntimeRole(safeRole)).toBe(false)
  })

  test.each([
    "rolsuper",
    "rolcreaterole",
    "rolcreatedb",
    "rolbypassrls",
  ] as const)("rejects a role with %s", (privilege) => {
    expect(
      isPrivilegedRuntimeRole({
        ...safeRole,
        [privilege]: true,
      }),
    ).toBe(true)
  })
})
