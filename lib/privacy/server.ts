import "server-only"

import {
  buildFinanceDataExport,
  financeExportTableNames,
  type FinanceExportRow,
  type FinanceExportTables,
} from "@/lib/privacy/data-export"
import { withFinanceTransaction } from "@/lib/db/transaction"

const financeDeletionOrder = [
  "budget_monthly_snapshots",
  "budget_transaction_assignments",
  "budget_summaries",
  "credit_card_payments",
  "recurring_bill_payments",
  "credit_card_annuality_overrides",
  "cash_forecast_exclusions",
  "cash_forecast_adjustments",
  "cash_forecast_settings",
  "transactions",
  "credit_card_statements",
  "recurring_bills",
  "budgets",
  "monthly_report_runs",
  "account_summaries",
  "pots",
  "credit_cards",
  "accounts",
  "counterparties",
  "categories",
] as const

export async function loadFinanceDataExport(
  userId: string,
  generatedAt = new Date(),
) {
  return withFinanceTransaction(userId, async (client) => {
    const entries: [keyof FinanceExportTables, FinanceExportRow[]][] = []

    for (const tableName of financeExportTableNames) {
      const result = await client.query<FinanceExportRow>(
        `SELECT * FROM "${tableName}" WHERE user_id = app.current_user_id()`,
      )
      entries.push([tableName, result.rows])
    }

    return buildFinanceDataExport(
      Object.fromEntries(entries) as FinanceExportTables,
      generatedAt,
    )
  })
}

export async function deleteFinanceProfile(userId: string) {
  return withFinanceTransaction(userId, async (client) => {
    for (const tableName of financeDeletionOrder) {
      await client.query(
        `DELETE FROM "${tableName}" WHERE user_id = app.current_user_id()`,
      )
    }

    const result = await client.query(
      "DELETE FROM profiles WHERE user_id = app.current_user_id() RETURNING user_id",
    )

    return result.rowCount === 1
  })
}
