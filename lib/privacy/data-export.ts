export const FINANCE_EXPORT_VERSION = 1 as const
export const MAX_FINANCE_EXPORT_BYTES = 10 * 1024 * 1024

export const financeExportTableNames = [
  "profiles",
  "accounts",
  "account_summaries",
  "categories",
  "counterparties",
  "transactions",
  "budgets",
  "budget_summaries",
  "budget_transaction_assignments",
  "monthly_report_runs",
  "budget_monthly_snapshots",
  "pots",
  "recurring_bills",
  "recurring_bill_payments",
  "credit_cards",
  "credit_card_statements",
  "credit_card_payments",
  "credit_card_annuality_overrides",
  "cash_forecast_settings",
  "cash_forecast_adjustments",
  "cash_forecast_exclusions",
] as const

export type FinanceExportTableName = (typeof financeExportTableNames)[number]
export type FinanceExportRow = Record<string, unknown>
export type FinanceExportTables = Record<
  FinanceExportTableName,
  FinanceExportRow[]
>

export interface FinanceDataExport {
  version: typeof FINANCE_EXPORT_VERSION
  generated_at: string
  tables: FinanceExportTables
}

export class FinanceExportTooLargeError extends Error {
  constructor() {
    super("Finance export exceeds the closed beta download limit.")
    this.name = "FinanceExportTooLargeError"
  }
}

export function buildFinanceDataExport(
  tables: FinanceExportTables,
  generatedAt = new Date(),
): FinanceDataExport {
  return {
    version: FINANCE_EXPORT_VERSION,
    generated_at: generatedAt.toISOString(),
    tables,
  }
}

export function serializeFinanceDataExport(
  dataExport: FinanceDataExport,
  maxBytes = MAX_FINANCE_EXPORT_BYTES,
) {
  const body = JSON.stringify(dataExport, null, 2)

  if (new TextEncoder().encode(body).byteLength > maxBytes) {
    throw new FinanceExportTooLargeError()
  }

  return body
}

export function getFinanceExportHeaders(generatedAt: Date) {
  const date = generatedAt.toISOString().slice(0, 10)

  return {
    "Cache-Control": "no-store",
    "Content-Disposition": `attachment; filename="finance-data-${date}.json"`,
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
  }
}
