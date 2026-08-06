import { describe, expect, test } from "bun:test"

import {
  buildFinanceDataExport,
  financeExportTableNames,
  getFinanceExportHeaders,
  serializeFinanceDataExport,
  type FinanceExportTables,
} from "@/lib/privacy/data-export"
import { createFinanceExportResponse } from "@/lib/privacy/export-response"

function emptyExportTables() {
  return Object.fromEntries(
    financeExportTableNames.map((tableName) => [tableName, []]),
  ) as unknown as FinanceExportTables
}

describe("finance data export", () => {
  test("builds a versioned document with explicit table names", () => {
    const generatedAt = new Date("2026-08-01T12:34:56.000Z")
    const tables = emptyExportTables()
    tables.profiles = [{ user_id: "user-1", default_currency: "MXN" }]

    const dataExport = buildFinanceDataExport(tables, generatedAt)
    const serialized = JSON.parse(serializeFinanceDataExport(dataExport))

    expect(serialized).toEqual({
      version: 1,
      generated_at: "2026-08-01T12:34:56.000Z",
      tables,
    })
    expect(Object.keys(serialized.tables)).toEqual([...financeExportTableNames])
  })

  test("sets private attachment response headers", () => {
    const headers = getFinanceExportHeaders(
      new Date("2026-08-01T12:34:56.000Z"),
    )

    expect(headers).toEqual({
      "Cache-Control": "no-store",
      "Content-Disposition":
        'attachment; filename="finance-data-2026-08-01.json"',
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    })
  })
})

describe("createFinanceExportResponse", () => {
  test("rejects an unauthenticated request before loading finance data", async () => {
    let loadCalled = false

    const response = await createFinanceExportResponse({
      getAuthenticatedUserId: async () => null,
      loadDataExport: async () => {
        loadCalled = true
        return buildFinanceDataExport(emptyExportTables())
      },
    })

    expect(response.status).toBe(401)
    expect(response.headers.get("cache-control")).toBe("no-store")
    expect(loadCalled).toBe(false)
  })
})
