import "server-only"

import type { PoolClient } from "pg"

import { getDatabasePool } from "@/lib/db/client"
import { getCurrentPeriod, getNextPeriod, getPreviousPeriod } from "./period"

const BUDGETS_REPORT_MODULE = "budgets"

export interface MonthlyBudgetCloseResult {
  period: string
  nextPeriod: string
  usersChecked: number
  usersClosed: number
  usersSkipped: number
  snapshotsCreated: number
  budgetsCopied: number
  failures: { userId: string; message: string }[]
}

interface UserCloseResult {
  status: "closed" | "skipped"
  snapshotsCreated: number
  budgetsCopied: number
}

async function withCronTransaction<T>(
  callback: (client: PoolClient) => Promise<T>,
) {
  const client = await getDatabasePool().connect()

  try {
    await client.query("BEGIN")
    await client.query("SELECT set_config('app.cron_job', 'true', true)")
    const result = await callback(client)
    await client.query("COMMIT")
    return result
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown monthly close error."
}

async function getUsersWithBudgets(period: string) {
  return withCronTransaction(async (client) => {
    const result = await client.query<{ user_id: string }>(
      `
        SELECT DISTINCT p.user_id
        FROM profiles p
        JOIN budgets b ON b.user_id = p.user_id
        WHERE b.period = $1
        ORDER BY p.user_id
      `,
      [period],
    )

    return result.rows.map((row) => row.user_id)
  })
}

async function closeUserBudgetPeriod(
  userId: string,
  period: string,
  nextPeriod: string,
): Promise<UserCloseResult> {
  return withCronTransaction(async (client) => {
    const existingRun = await client.query<{ id: string; status: string }>(
      `
        SELECT id, status
        FROM monthly_report_runs
        WHERE user_id = $1
          AND module = $2
          AND period = $3
      `,
      [userId, BUDGETS_REPORT_MODULE, period],
    )

    if (existingRun.rows[0]?.status === "completed") {
      return { status: "skipped", snapshotsCreated: 0, budgetsCopied: 0 }
    }

    const reportRun = await client.query<{ id: string }>(
      `
        INSERT INTO monthly_report_runs (
          user_id,
          module,
          period,
          status,
          started_at,
          completed_at,
          error_message
        )
        VALUES ($1, $2, $3, 'running', now(), NULL, NULL)
        ON CONFLICT (user_id, module, period)
        DO UPDATE SET
          status = 'running',
          started_at = now(),
          completed_at = NULL,
          error_message = NULL
        RETURNING id
      `,
      [userId, BUDGETS_REPORT_MODULE, period],
    )
    const reportRunId = reportRun.rows[0].id

    const snapshots = await client.query(
      `
        INSERT INTO budget_monthly_snapshots (
          user_id,
          monthly_report_run_id,
          period,
          source_budget_id,
          category_id,
          category_name,
          theme_color,
          limit_cents,
          spent_cents,
          free_cents,
          assigned_transaction_count
        )
        SELECT
          b.user_id,
          $3,
          b.period,
          b.id,
          b.category_id,
          c.name,
          b.theme_color,
          b.limit_cents,
          COALESCE(SUM(bta.assigned_amount_cents), 0)::integer,
          GREATEST(
            b.limit_cents - COALESCE(SUM(bta.assigned_amount_cents), 0),
            0
          )::integer,
          COUNT(bta.id)::integer
        FROM budgets b
        JOIN categories c ON c.id = b.category_id
        LEFT JOIN budget_transaction_assignments bta
          ON bta.user_id = b.user_id
          AND bta.budget_id = b.id
        WHERE b.user_id = $1
          AND b.period = $2
        GROUP BY b.user_id, b.period, b.id, b.category_id, c.name, b.theme_color, b.limit_cents
        ON CONFLICT (user_id, period, source_budget_id) DO NOTHING
      `,
      [userId, period, reportRunId],
    )

    const copiedBudgets = await client.query(
      `
        INSERT INTO budgets (user_id, category_id, period, limit_cents, theme_color)
        SELECT user_id, category_id, $3, limit_cents, theme_color
        FROM budgets
        WHERE user_id = $1
          AND period = $2
        ON CONFLICT (user_id, category_id, period) DO NOTHING
      `,
      [userId, period, nextPeriod],
    )

    await client.query(
      `
        UPDATE monthly_report_runs
        SET status = 'completed',
            completed_at = now(),
            error_message = NULL
        WHERE user_id = $1
          AND id = $2
      `,
      [userId, reportRunId],
    )

    return {
      status: "closed",
      snapshotsCreated: snapshots.rowCount ?? 0,
      budgetsCopied: copiedBudgets.rowCount ?? 0,
    }
  })
}

async function recordBudgetCloseFailure(
  userId: string,
  period: string,
  message: string,
) {
  await withCronTransaction(async (client) => {
    await client.query(
      `
        INSERT INTO monthly_report_runs (
          user_id,
          module,
          period,
          status,
          started_at,
          completed_at,
          error_message
        )
        VALUES ($1, $2, $3, 'failed', now(), now(), $4)
        ON CONFLICT (user_id, module, period)
        DO UPDATE SET
          status = 'failed',
          completed_at = now(),
          error_message = excluded.error_message
        WHERE monthly_report_runs.status <> 'completed'
      `,
      [userId, BUDGETS_REPORT_MODULE, period, message],
    )
  })
}

export async function closeMonthlyBudgets(
  now = new Date(),
): Promise<MonthlyBudgetCloseResult> {
  const period = getPreviousPeriod(now)
  const nextPeriod = getNextPeriod(period)
  const userIds = await getUsersWithBudgets(period)
  const result: MonthlyBudgetCloseResult = {
    period,
    nextPeriod,
    usersChecked: userIds.length,
    usersClosed: 0,
    usersSkipped: 0,
    snapshotsCreated: 0,
    budgetsCopied: 0,
    failures: [],
  }

  for (const userId of userIds) {
    try {
      const userResult = await closeUserBudgetPeriod(userId, period, nextPeriod)

      if (userResult.status === "skipped") {
        result.usersSkipped += 1
      } else {
        result.usersClosed += 1
      }

      result.snapshotsCreated += userResult.snapshotsCreated
      result.budgetsCopied += userResult.budgetsCopied
    } catch (error) {
      const message = errorMessage(error)
      result.failures.push({ userId, message })

      try {
        await recordBudgetCloseFailure(userId, period, message)
      } catch (recordError) {
        result.failures.push({
          userId,
          message: `Could not record failure: ${errorMessage(recordError)}`,
        })
      }
    }
  }

  return result
}

export function getMonthlyBudgetClosePeriods(now = new Date()) {
  const period = getPreviousPeriod(now)

  return {
    period,
    nextPeriod: getCurrentPeriod(now),
  }
}
