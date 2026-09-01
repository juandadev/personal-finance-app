import { describe, expect, test } from "bun:test"

import { getNavItems, navItems } from "@/lib/data"

describe("getNavItems", () => {
  test("keeps the product navigation unchanged for non-admins", () => {
    expect(getNavItems()).toEqual(navItems)
    expect(getNavItems({ isAdmin: false })).toEqual(navItems)
    expect(getNavItems().some((item) => item.href === "/admin")).toBe(false)
  })

  test("appends the admin item only when requested", () => {
    const items = getNavItems({ isAdmin: true })

    expect(items.slice(0, -1)).toEqual(navItems)
    expect(items.at(-1)).toEqual(
      expect.objectContaining({
        href: "/admin",
        key: "admin",
        label: "Admin",
      }),
    )
  })
})
