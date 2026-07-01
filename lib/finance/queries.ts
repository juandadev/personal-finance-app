import "server-only"

import type { PoolClient } from "pg"

import { withFinanceTransaction } from "@/lib/db/transaction"
import type {
  AccountRecord,
  AccountSummaryRecord,
  BudgetRecord,
  BudgetSummaryRecord,
  BudgetTransactionAssignmentRecord,
  CategoryRecord,
  CounterpartyRecord,
  FinanceState,
  PotRecord,
  RecurringBillRecord,
  TransactionRecord,
  UserPreferencesRecord,
} from "@/lib/finance/types"
import { getCurrentPeriod } from "@/lib/finance/period"

const profileColumns = ["user_id", "default_currency", "timezone"]
const accountColumns = [
  "user_id",
  "id",
  "name",
  "type",
  "currency",
  "current_balance_cents",
]
const accountSummaryColumns = [
  "user_id",
  "id",
  "account_id",
  "period",
  "income_cents",
  "expense_cents",
]
const counterpartyColumns = [
  "user_id",
  "id",
  "display_name",
  "avatar_url",
  "type",
]
const budgetColumns = [
  "user_id",
  "id",
  "category_id",
  "period",
  "limit_cents",
  "theme_color",
]
const budgetSummaryColumns = ["user_id", "budget_id", "spent_cents"]
const budgetAssignmentColumns = [
  "user_id",
  "id",
  "budget_id",
  "transaction_id",
  "assigned_amount_cents",
]
const potColumns = [
  "user_id",
  "id",
  "name",
  "balance_cents",
  "target_cents",
  "theme_color",
  "due_date::text AS due_date",
]
const recurringBillColumns = [
  "user_id",
  "id",
  "counterparty_id",
  "amount_cents",
  "currency",
  "frequency",
  "due_day_of_month",
  "status",
]

async function ensureUserProfile(
  client: PoolClient,
  userId: string,
  displayName: string | null,
) {
  await client.query(
    `
      INSERT INTO profiles (user_id, display_name, default_currency)
      VALUES ($1, $2, 'USD')
      ON CONFLICT (user_id)
      DO UPDATE SET display_name = COALESCE(excluded.display_name, profiles.display_name)
    `,
    [userId, displayName],
  )
}

export async function loadFinanceState(
  userId: string,
  displayName: string | null,
): Promise<FinanceState> {
  return withFinanceTransaction(userId, async (client) => {
    await ensureUserProfile(client, userId, displayName)
    const currentPeriod = getCurrentPeriod()

    const profile = await client.query<UserPreferencesRecord>(
      `SELECT ${profileColumns.join(", ")} FROM profiles WHERE user_id = $1`,
      [userId],
    )
    const accounts = await client.query<AccountRecord>(
      `SELECT ${accountColumns.join(", ")} FROM accounts WHERE user_id = $1 ORDER BY id`,
      [userId],
    )
    const accountSummaries = await client.query<AccountSummaryRecord>(
      `SELECT ${accountSummaryColumns.join(", ")} FROM account_summaries WHERE user_id = $1 ORDER BY period DESC, id`,
      [userId],
    )
    const categories = await client.query<CategoryRecord>(
      "SELECT id, name, slug FROM categories ORDER BY id",
    )
    const counterparties = await client.query<CounterpartyRecord>(
      `SELECT ${counterpartyColumns.join(", ")} FROM counterparties WHERE user_id = $1 ORDER BY display_name, id`,
      [userId],
    )
    const transactions = await client.query<TransactionRecord>(
      `SELECT user_id, id, account_id, counterparty_id, category_id, amount_cents, posted_at::text, description FROM transactions WHERE user_id = $1 ORDER BY posted_at DESC, id`,
      [userId],
    )
    const budgets = await client.query<BudgetRecord>(
      `SELECT ${budgetColumns.join(", ")} FROM budgets WHERE user_id = $1 AND period = $2 ORDER BY id`,
      [userId, currentPeriod],
    )
    const budgetSummaries = await client.query<BudgetSummaryRecord>(
      `SELECT ${budgetSummaryColumns.join(", ")} FROM budget_summaries WHERE user_id = $1 ORDER BY budget_id`,
      [userId],
    )
    const budgetTransactionAssignments =
      await client.query<BudgetTransactionAssignmentRecord>(
        `
          SELECT ${budgetAssignmentColumns.map((column) => `bta.${column}`).join(", ")}
          FROM budget_transaction_assignments bta
          JOIN budgets b
            ON b.user_id = bta.user_id
            AND b.id = bta.budget_id
          WHERE bta.user_id = $1
            AND b.period = $2
          ORDER BY bta.created_at, bta.id
        `,
        [userId, currentPeriod],
      )
    const pots = await client.query<PotRecord>(
      `SELECT ${potColumns.join(", ")} FROM pots WHERE user_id = $1 ORDER BY created_at, id`,
      [userId],
    )
    const recurringBills = await client.query<RecurringBillRecord>(
      `SELECT ${recurringBillColumns.join(", ")} FROM recurring_bills WHERE user_id = $1 ORDER BY due_day_of_month, id`,
      [userId],
    )

    return {
      preferences: profile.rows[0],
      accounts: accounts.rows,
      accountSummaries: accountSummaries.rows,
      categories: categories.rows,
      counterparties: counterparties.rows,
      transactions: transactions.rows,
      budgets: budgets.rows,
      budgetSummaries: budgetSummaries.rows,
      budgetTransactionAssignments: budgetTransactionAssignments.rows,
      pots: pots.rows,
      recurringBills: recurringBills.rows,
    }
  })
}

export async function insertBudget(
  userId: string,
  budget: BudgetRecord,
  spentCents: number,
) {
  return withFinanceTransaction(userId, async (client) => {
    // language=SQL format=false
    const budgetResult = await client.query<BudgetRecord>(
      `
        INSERT INTO budgets (user_id, id, category_id, period, limit_cents, theme_color)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING user_id, id, category_id, period, limit_cents, theme_color
      `,
      [
        userId,
        budget.id,
        budget.category_id,
        budget.period,
        budget.limit_cents,
        budget.theme_color,
      ],
    )
    const summaryResult = await client.query<BudgetSummaryRecord>(
      `
        INSERT INTO budget_summaries (user_id, budget_id, spent_cents)
        VALUES ($1, $2, $3)
        RETURNING user_id, budget_id, spent_cents
      `,
      [userId, budget.id, spentCents],
    )

    return {
      budget: budgetResult.rows[0],
      budgetSummary: summaryResult.rows[0],
    }
  })
}

export async function updateBudget(
  userId: string,
  id: string,
  updates: Partial<Omit<BudgetRecord, "id" | "user_id">>,
  spentCents?: number,
) {
  return withFinanceTransaction(userId, async (client) => {
    const budgetResult = await client.query<BudgetRecord>(
      `
        UPDATE budgets
        SET
          category_id = COALESCE($2, category_id),
          period = COALESCE($3, period),
          limit_cents = COALESCE($4, limit_cents),
          theme_color = COALESCE($5, theme_color)
        WHERE user_id = $1 AND id = $6
        RETURNING user_id, id, category_id, period, limit_cents, theme_color
      `,
      [
        userId,
        updates.category_id ?? null,
        updates.period ?? null,
        updates.limit_cents ?? null,
        updates.theme_color ?? null,
        id,
      ],
    )

    if (!budgetResult.rowCount) {
      throw new Error("Budget not found.")
    }

    let budgetSummary: BudgetSummaryRecord | null = null

    if (spentCents !== undefined) {
      const summaryResult = await client.query<BudgetSummaryRecord>(
        `
          INSERT INTO budget_summaries (user_id, budget_id, spent_cents)
          VALUES ($1, $2, $3)
          ON CONFLICT (user_id, budget_id)
          DO UPDATE SET spent_cents = excluded.spent_cents
          RETURNING user_id, budget_id, spent_cents
        `,
        [userId, id, spentCents],
      )
      budgetSummary = summaryResult.rows[0]
    }

    return {
      budget: budgetResult.rows[0],
      budgetSummary,
    }
  })
}

export async function deleteBudget(userId: string, id: string) {
  return withFinanceTransaction(userId, async (client) => {
    const result = await client.query(
      "DELETE FROM budgets WHERE user_id = $1 AND id = $2",
      [userId, id],
    )

    if (!result.rowCount) {
      throw new Error("Budget not found.")
    }
  })
}

export async function assignTransactionToBudget(
  userId: string,
  transactionId: string,
  budgetId: string,
) {
  return withFinanceTransaction(userId, async (client) => {
    const currentPeriod = getCurrentPeriod()
    const result = await client.query<BudgetTransactionAssignmentRecord>(
      `
        WITH eligible_assignment AS (
          SELECT
            t.user_id,
            b.id AS budget_id,
            t.id AS transaction_id,
            abs(t.amount_cents) AS assigned_amount_cents
          FROM transactions t
          JOIN budgets b
            ON b.user_id = t.user_id
            AND b.id = $3
            AND b.period = $4
          WHERE t.user_id = $1
            AND t.id = $2
            AND t.amount_cents < 0
            AND to_char(t.posted_at, 'YYYY-MM') = b.period
        )
        INSERT INTO budget_transaction_assignments (
          user_id,
          budget_id,
          transaction_id,
          assigned_amount_cents
        )
        SELECT
          user_id,
          budget_id,
          transaction_id,
          assigned_amount_cents
        FROM eligible_assignment
        ON CONFLICT (user_id, transaction_id)
        DO UPDATE SET
          budget_id = excluded.budget_id,
          assigned_amount_cents = excluded.assigned_amount_cents
        RETURNING user_id, id, budget_id, transaction_id, assigned_amount_cents
      `,
      [userId, transactionId, budgetId, currentPeriod],
    )

    if (!result.rowCount) {
      throw new Error(
        "Only current-month expense transactions can be assigned to budgets.",
      )
    }

    return result.rows[0]
  })
}

export async function unassignTransactionFromBudget(
  userId: string,
  transactionId: string,
) {
  return withFinanceTransaction(userId, async (client) => {
    const result = await client.query<BudgetTransactionAssignmentRecord>(
      `
        DELETE FROM budget_transaction_assignments
        WHERE user_id = $1 AND transaction_id = $2
        RETURNING user_id, id, budget_id, transaction_id, assigned_amount_cents
      `,
      [userId, transactionId],
    )

    return result.rows[0] ?? null
  })
}

export async function insertPot(userId: string, pot: PotRecord) {
  return withFinanceTransaction(userId, async (client) => {
    const result = await client.query<PotRecord>(
      `
        INSERT INTO pots (user_id, id, name, balance_cents, target_cents, theme_color, due_date)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING user_id, id, name, balance_cents, target_cents, theme_color, due_date::text AS due_date
      `,
      [
        userId,
        pot.id,
        pot.name,
        pot.balance_cents,
        pot.target_cents,
        pot.theme_color,
        pot.due_date,
      ],
    )

    return result.rows[0]
  })
}

export async function updatePot(
  userId: string,
  id: string,
  updates: Partial<Omit<PotRecord, "id" | "user_id">>,
) {
  return withFinanceTransaction(userId, async (client) => {
    const result = await client.query<PotRecord>(
      `
        UPDATE pots
        SET
          name = COALESCE($2, name),
          balance_cents = COALESCE($3, balance_cents),
          target_cents = COALESCE($4, target_cents),
          theme_color = COALESCE($5, theme_color),
          due_date = CASE WHEN $6::boolean THEN $7::date ELSE due_date END
        WHERE user_id = $1 AND id = $8
        RETURNING user_id, id, name, balance_cents, target_cents, theme_color, due_date::text AS due_date
      `,
      [
        userId,
        updates.name ?? null,
        updates.balance_cents ?? null,
        updates.target_cents ?? null,
        updates.theme_color ?? null,
        updates.due_date !== undefined,
        updates.due_date ?? null,
        id,
      ],
    )

    if (!result.rowCount) {
      throw new Error("Pot not found.")
    }

    return result.rows[0]
  })
}

export async function transferPotBalance(
  userId: string,
  id: string,
  amountCents: number,
  mode: "deposit" | "withdraw",
) {
  return withFinanceTransaction(userId, async (client) => {
    const result = await client.query<PotRecord>(
      `
        UPDATE pots
        SET balance_cents =
          CASE
            WHEN $3::text = 'deposit' THEN balance_cents + $2
            ELSE balance_cents - $2
          END
        WHERE user_id = $1
          AND id = $4
          AND ($3::text = 'deposit' OR balance_cents >= $2)
        RETURNING user_id, id, name, balance_cents, target_cents, theme_color, due_date::text AS due_date
      `,
      [userId, amountCents, mode, id],
    )

    if (!result.rowCount) {
      throw new Error(
        mode === "withdraw"
          ? "This pot does not have enough money for that withdrawal."
          : "Pot not found.",
      )
    }

    return result.rows[0]
  })
}

export async function deletePot(userId: string, id: string) {
  return withFinanceTransaction(userId, async (client) => {
    const result = await client.query(
      "DELETE FROM pots WHERE user_id = $1 AND id = $2",
      [userId, id],
    )

    if (!result.rowCount) {
      throw new Error("Pot not found.")
    }
  })
}
