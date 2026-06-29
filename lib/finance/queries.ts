import "server-only"

import type { PoolClient } from "pg"

import { withFinanceTransaction } from "@/lib/db/transaction"
import type {
  AccountRecord,
  AccountSummaryRecord,
  BudgetRecord,
  BudgetSummaryRecord,
  CategoryRecord,
  CounterpartyRecord,
  FinanceState,
  PotRecord,
  RecurringBillRecord,
  TransactionRecord,
} from "@/lib/finance/types"

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
const potColumns = [
  "user_id",
  "id",
  "name",
  "balance_cents",
  "target_cents",
  "theme_color",
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
      INSERT INTO profiles (user_id, display_name)
      VALUES ($1, $2)
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

    const [
      accounts,
      accountSummaries,
      categories,
      counterparties,
      transactions,
      budgets,
      budgetSummaries,
      pots,
      recurringBills,
    ] = await Promise.all([
      client.query<AccountRecord>(
        `SELECT ${accountColumns.join(", ")} FROM accounts WHERE user_id = $1 ORDER BY id`,
        [userId],
      ),
      client.query<AccountSummaryRecord>(
        `SELECT ${accountSummaryColumns.join(", ")} FROM account_summaries WHERE user_id = $1 ORDER BY period DESC, id`,
        [userId],
      ),
      client.query<CategoryRecord>(
        "SELECT id, name, slug FROM categories ORDER BY id",
      ),
      client.query<CounterpartyRecord>(
        `SELECT ${counterpartyColumns.join(", ")} FROM counterparties WHERE user_id = $1 ORDER BY display_name, id`,
        [userId],
      ),
      client.query<TransactionRecord>(
        `SELECT user_id, id, account_id, counterparty_id, category_id, amount_cents, posted_at::text, description FROM transactions WHERE user_id = $1 ORDER BY posted_at DESC, id`,
        [userId],
      ),
      client.query<BudgetRecord>(
        `SELECT ${budgetColumns.join(", ")} FROM budgets WHERE user_id = $1 ORDER BY period DESC, id`,
        [userId],
      ),
      client.query<BudgetSummaryRecord>(
        `SELECT ${budgetSummaryColumns.join(", ")} FROM budget_summaries WHERE user_id = $1 ORDER BY budget_id`,
        [userId],
      ),
      client.query<PotRecord>(
        `SELECT ${potColumns.join(", ")} FROM pots WHERE user_id = $1 ORDER BY created_at, id`,
        [userId],
      ),
      client.query<RecurringBillRecord>(
        `SELECT ${recurringBillColumns.join(", ")} FROM recurring_bills WHERE user_id = $1 ORDER BY due_day_of_month, id`,
        [userId],
      ),
    ])

    return {
      accounts: accounts.rows,
      accountSummaries: accountSummaries.rows,
      categories: categories.rows,
      counterparties: counterparties.rows,
      transactions: transactions.rows,
      budgets: budgets.rows,
      budgetSummaries: budgetSummaries.rows,
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

export async function insertPot(userId: string, pot: PotRecord) {
  return withFinanceTransaction(userId, async (client) => {
    const result = await client.query<PotRecord>(
      `
        INSERT INTO pots (user_id, id, name, balance_cents, target_cents, theme_color)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING user_id, id, name, balance_cents, target_cents, theme_color
      `,
      [
        userId,
        pot.id,
        pot.name,
        pot.balance_cents,
        pot.target_cents,
        pot.theme_color,
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
          theme_color = COALESCE($5, theme_color)
        WHERE user_id = $1 AND id = $6
        RETURNING user_id, id, name, balance_cents, target_cents, theme_color
      `,
      [
        userId,
        updates.name ?? null,
        updates.balance_cents ?? null,
        updates.target_cents ?? null,
        updates.theme_color ?? null,
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
        RETURNING user_id, id, name, balance_cents, target_cents, theme_color
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
