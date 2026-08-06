import "server-only"

import { z } from "zod"

import { getSchedulerDatabasePool } from "@/lib/db/scheduler-client"
import { getCurrentPeriod, getNextPeriod, getPreviousPeriod } from "./period"

const monthlyCloseRowSchema = z.object({
  users_checked: z.number().int().nonnegative(),
  users_closed: z.number().int().nonnegative(),
  users_skipped: z.number().int().nonnegative(),
  snapshots_created: z.number().int().nonnegative(),
  budgets_copied: z.number().int().nonnegative(),
  failure_count: z.number().int().nonnegative(),
})

export interface MonthlyBudgetCloseResult {
  period: string
  nextPeriod: string
  usersChecked: number
  usersClosed: number
  usersSkipped: number
  snapshotsCreated: number
  budgetsCopied: number
  failureCount: number
}

export async function closeMonthlyBudgets(
  now = new Date(),
): Promise<MonthlyBudgetCloseResult> {
  const period = getPreviousPeriod(now)
  const nextPeriod = getNextPeriod(period)
  const result = await getSchedulerDatabasePool().query(
    `
      SELECT
        users_checked,
        users_closed,
        users_skipped,
        snapshots_created,
        budgets_copied,
        failure_count
      FROM app.close_monthly_budgets($1, $2)
    `,
    [period, nextPeriod],
  )
  const row = monthlyCloseRowSchema.parse(result.rows[0])

  return {
    period,
    nextPeriod,
    usersChecked: row.users_checked,
    usersClosed: row.users_closed,
    usersSkipped: row.users_skipped,
    snapshotsCreated: row.snapshots_created,
    budgetsCopied: row.budgets_copied,
    failureCount: row.failure_count,
  }
}

export function getMonthlyBudgetClosePeriods(now = new Date()) {
  const period = getPreviousPeriod(now)

  return {
    period,
    nextPeriod: getCurrentPeriod(now),
  }
}
