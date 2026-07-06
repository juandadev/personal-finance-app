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
  NewCategoryRecord,
  NewCounterpartyRecord,
  NewTransactionRecord,
  PotRecord,
  RecurringBillRecord,
  TransactionRecord,
  UserPreferencesRecord,
} from "@/lib/finance/types"
import { getCurrentPeriod } from "@/lib/finance/period"
import type { ThemeColor } from "@/lib/theme-colors"

const defaultCategorySeeds: {
  name: string
  slug: string
  theme_color: ThemeColor
}[] = [
  { name: "Entertainment", slug: "entertainment", theme_color: "chart-1" },
  { name: "Bills", slug: "bills", theme_color: "chart-2" },
  { name: "Groceries", slug: "groceries", theme_color: "chart-3" },
  { name: "Dining Out", slug: "dining-out", theme_color: "chart-4" },
  { name: "Transportation", slug: "transportation", theme_color: "chart-5" },
  {
    name: "Personal Care",
    slug: "personal-care",
    theme_color: "finance-purple",
  },
  {
    name: "Emergency Fund",
    slug: "emergency-fund",
    theme_color: "finance-turquoise",
  },
  { name: "Education", slug: "education", theme_color: "finance-brown" },
  { name: "Lifestyle", slug: "lifestyle", theme_color: "finance-magenta" },
  { name: "Shopping", slug: "shopping", theme_color: "finance-blue" },
  { name: "General", slug: "general", theme_color: "finance-grey" },
]

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
  "theme_color",
  "notes",
]
const categoryColumns = ["user_id", "id", "name", "slug", "theme_color"]
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

async function ensureDefaultCategories(client: PoolClient, userId: string) {
  const existing = await client.query(
    "SELECT 1 FROM categories WHERE user_id = $1 LIMIT 1",
    [userId],
  )

  if (existing.rowCount) {
    return
  }

  for (const category of defaultCategorySeeds) {
    await client.query(
      `
        INSERT INTO categories (user_id, name, slug, theme_color)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT DO NOTHING
      `,
      [userId, category.name, category.slug, category.theme_color],
    )
  }
}

function toPeriod(isoDate: string) {
  return isoDate.slice(0, 7)
}

export async function loadFinanceState(
  userId: string,
  displayName: string | null,
): Promise<FinanceState> {
  return withFinanceTransaction(userId, async (client) => {
    await ensureUserProfile(client, userId, displayName)
    await ensureDefaultCategories(client, userId)
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
      `SELECT ${categoryColumns.join(", ")} FROM categories WHERE user_id = $1 ORDER BY name, id`,
      [userId],
    )
    const counterparties = await client.query<CounterpartyRecord>(
      `SELECT ${counterpartyColumns.join(", ")} FROM counterparties WHERE user_id = $1 ORDER BY display_name, id`,
      [userId],
    )
    const transactions = await client.query<TransactionRecord>(
      `SELECT user_id, id, account_id, counterparty_id, category_id, concept, amount_cents, posted_at::text, description FROM transactions WHERE user_id = $1 ORDER BY posted_at DESC, id`,
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

async function assertUserRecord(
  client: PoolClient,
  table: "accounts" | "categories" | "counterparties",
  userId: string,
  id: string,
  label: string,
) {
  const result = await client.query(
    `SELECT 1 FROM ${table} WHERE user_id = $1 AND id = $2 LIMIT 1`,
    [userId, id],
  )

  if (!result.rowCount) {
    throw new Error(`${label} not found.`)
  }
}

async function applyTransactionEffects(
  client: PoolClient,
  userId: string,
  transaction: Pick<
    TransactionRecord,
    "account_id" | "amount_cents" | "posted_at"
  >,
  direction: 1 | -1,
) {
  const balanceDelta = transaction.amount_cents * direction
  const incomeDelta =
    transaction.amount_cents > 0 ? transaction.amount_cents * direction : 0
  const expenseDelta =
    transaction.amount_cents < 0
      ? Math.abs(transaction.amount_cents) * direction
      : 0
  const period = toPeriod(transaction.posted_at)

  const accountResult = await client.query<AccountRecord>(
    `
      UPDATE accounts
      SET current_balance_cents = current_balance_cents + $3
      WHERE user_id = $1 AND id = $2
      RETURNING ${accountColumns.join(", ")}
    `,
    [userId, transaction.account_id, balanceDelta],
  )

  if (!accountResult.rowCount) {
    throw new Error("Account not found.")
  }

  const summaryResult = await client.query<AccountSummaryRecord>(
    `
      INSERT INTO account_summaries (
        user_id,
        account_id,
        period,
        income_cents,
        expense_cents
      )
      VALUES ($1, $2, $3, GREATEST($4::integer, 0), GREATEST($5::integer, 0))
      ON CONFLICT (user_id, account_id, period)
      DO UPDATE SET
        income_cents = account_summaries.income_cents + $4,
        expense_cents = account_summaries.expense_cents + $5
      RETURNING ${accountSummaryColumns.join(", ")}
    `,
    [userId, transaction.account_id, period, incomeDelta, expenseDelta],
  )

  return {
    account: accountResult.rows[0],
    accountSummary: summaryResult.rows[0],
  }
}

async function syncBudgetAssignment(
  client: PoolClient,
  userId: string,
  transaction: TransactionRecord,
  budgetId: string | null,
) {
  if (transaction.amount_cents >= 0 || !budgetId) {
    await client.query(
      "DELETE FROM budget_transaction_assignments WHERE user_id = $1 AND transaction_id = $2",
      [userId, transaction.id],
    )
    return null
  }

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
          AND b.category_id = t.category_id
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
    [userId, transaction.id, budgetId, getCurrentPeriod()],
  )

  if (!result.rowCount) {
    throw new Error(
      "Choose a matching current-month budget for this expense transaction.",
    )
  }

  return result.rows[0]
}

export async function insertCategory(
  userId: string,
  category: NewCategoryRecord,
) {
  return withFinanceTransaction(userId, async (client) => {
    const result = await client.query<CategoryRecord>(
      `
        INSERT INTO categories (user_id, id, name, slug, theme_color)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING ${categoryColumns.join(", ")}
      `,
      [userId, category.id, category.name, category.slug, category.theme_color],
    )

    return result.rows[0]
  })
}

export async function updateCategory(
  userId: string,
  id: string,
  updates: Partial<Omit<CategoryRecord, "id" | "user_id">>,
) {
  return withFinanceTransaction(userId, async (client) => {
    const result = await client.query<CategoryRecord>(
      `
        UPDATE categories
        SET
          name = COALESCE($2, name),
          slug = COALESCE($3, slug),
          theme_color = COALESCE($4, theme_color)
        WHERE user_id = $1 AND id = $5
        RETURNING ${categoryColumns.join(", ")}
      `,
      [
        userId,
        updates.name ?? null,
        updates.slug ?? null,
        updates.theme_color ?? null,
        id,
      ],
    )

    if (!result.rowCount) {
      throw new Error("Category not found.")
    }

    return result.rows[0]
  })
}

export async function deleteCategory(userId: string, id: string) {
  return withFinanceTransaction(userId, async (client) => {
    const usage = await client.query<{ count: string }>(
      `
        SELECT count(*) AS count
        FROM (
          SELECT id FROM transactions WHERE user_id = $1 AND category_id = $2
          UNION ALL
          SELECT id FROM budgets WHERE user_id = $1 AND category_id = $2
        ) used_category
      `,
      [userId, id],
    )

    if (Number(usage.rows[0]?.count ?? 0) > 0) {
      throw new Error(
        "This category is used by transactions or budgets and cannot be deleted.",
      )
    }

    const result = await client.query(
      "DELETE FROM categories WHERE user_id = $1 AND id = $2",
      [userId, id],
    )

    if (!result.rowCount) {
      throw new Error("Category not found.")
    }
  })
}

export async function insertCounterparty(
  userId: string,
  counterparty: NewCounterpartyRecord,
) {
  return withFinanceTransaction(userId, async (client) => {
    const result = await client.query<CounterpartyRecord>(
      `
        INSERT INTO counterparties (
          user_id,
          id,
          display_name,
          avatar_url,
          type,
          theme_color,
          notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING ${counterpartyColumns.join(", ")}
      `,
      [
        userId,
        counterparty.id,
        counterparty.display_name,
        counterparty.avatar_url,
        counterparty.type,
        counterparty.theme_color,
        counterparty.notes,
      ],
    )

    return result.rows[0]
  })
}

export async function updateCounterparty(
  userId: string,
  id: string,
  updates: Partial<Omit<CounterpartyRecord, "id" | "user_id">>,
) {
  return withFinanceTransaction(userId, async (client) => {
    const result = await client.query<CounterpartyRecord>(
      `
        UPDATE counterparties
        SET
          display_name = COALESCE($2, display_name),
          avatar_url = CASE WHEN $3::boolean THEN $4 ELSE avatar_url END,
          type = COALESCE($5, type),
          theme_color = COALESCE($6, theme_color),
          notes = CASE WHEN $7::boolean THEN $8 ELSE notes END
        WHERE user_id = $1 AND id = $9
        RETURNING ${counterpartyColumns.join(", ")}
      `,
      [
        userId,
        updates.display_name ?? null,
        updates.avatar_url !== undefined,
        updates.avatar_url ?? null,
        updates.type ?? null,
        updates.theme_color ?? null,
        updates.notes !== undefined,
        updates.notes ?? null,
        id,
      ],
    )

    if (!result.rowCount) {
      throw new Error("Contact not found.")
    }

    return result.rows[0]
  })
}

export async function deleteCounterparty(userId: string, id: string) {
  return withFinanceTransaction(userId, async (client) => {
    const usage = await client.query<{ count: string }>(
      `
        SELECT count(*) AS count
        FROM (
          SELECT id FROM transactions WHERE user_id = $1 AND counterparty_id = $2
          UNION ALL
          SELECT id FROM recurring_bills WHERE user_id = $1 AND counterparty_id = $2
        ) used_counterparty
      `,
      [userId, id],
    )

    if (Number(usage.rows[0]?.count ?? 0) > 0) {
      throw new Error(
        "This contact is used by transactions or recurring bills and cannot be deleted.",
      )
    }

    const result = await client.query(
      "DELETE FROM counterparties WHERE user_id = $1 AND id = $2",
      [userId, id],
    )

    if (!result.rowCount) {
      throw new Error("Contact not found.")
    }
  })
}

export async function insertTransaction(
  userId: string,
  transaction: NewTransactionRecord,
  budgetId: string | null,
) {
  return withFinanceTransaction(userId, async (client) => {
    await assertUserRecord(
      client,
      "accounts",
      userId,
      transaction.account_id,
      "Account",
    )
    await assertUserRecord(
      client,
      "categories",
      userId,
      transaction.category_id,
      "Category",
    )
    await assertUserRecord(
      client,
      "counterparties",
      userId,
      transaction.counterparty_id,
      "Contact",
    )

    const transactionResult = await client.query<TransactionRecord>(
      `
        INSERT INTO transactions (
          user_id,
          id,
          account_id,
          counterparty_id,
          category_id,
          concept,
          amount_cents,
          posted_at,
          description
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING user_id, id, account_id, counterparty_id, category_id, concept, amount_cents, posted_at::text, description
      `,
      [
        userId,
        transaction.id,
        transaction.account_id,
        transaction.counterparty_id,
        transaction.category_id,
        transaction.concept,
        transaction.amount_cents,
        transaction.posted_at,
        transaction.description,
      ],
    )
    const savedTransaction = transactionResult.rows[0]
    const effects = await applyTransactionEffects(
      client,
      userId,
      savedTransaction,
      1,
    )
    const budgetAssignment = await syncBudgetAssignment(
      client,
      userId,
      savedTransaction,
      budgetId,
    )

    return {
      transaction: savedTransaction,
      accounts: [effects.account],
      accountSummaries: [effects.accountSummary],
      budgetAssignment,
    }
  })
}

export async function updateTransaction(
  userId: string,
  id: string,
  updates: Omit<NewTransactionRecord, "id">,
  budgetId: string | null,
) {
  return withFinanceTransaction(userId, async (client) => {
    const existingResult = await client.query<TransactionRecord>(
      `
        SELECT user_id, id, account_id, counterparty_id, category_id, concept, amount_cents, posted_at::text, description
        FROM transactions
        WHERE user_id = $1 AND id = $2
      `,
      [userId, id],
    )

    if (!existingResult.rowCount) {
      throw new Error("Transaction not found.")
    }

    await assertUserRecord(
      client,
      "accounts",
      userId,
      updates.account_id,
      "Account",
    )
    await assertUserRecord(
      client,
      "categories",
      userId,
      updates.category_id,
      "Category",
    )
    await assertUserRecord(
      client,
      "counterparties",
      userId,
      updates.counterparty_id,
      "Contact",
    )

    const reversedEffects = await applyTransactionEffects(
      client,
      userId,
      existingResult.rows[0],
      -1,
    )
    const transactionResult = await client.query<TransactionRecord>(
      `
        UPDATE transactions
        SET
          account_id = $2,
          counterparty_id = $3,
          category_id = $4,
          concept = $5,
          amount_cents = $6,
          posted_at = $7,
          description = $8
        WHERE user_id = $1 AND id = $9
        RETURNING user_id, id, account_id, counterparty_id, category_id, concept, amount_cents, posted_at::text, description
      `,
      [
        userId,
        updates.account_id,
        updates.counterparty_id,
        updates.category_id,
        updates.concept,
        updates.amount_cents,
        updates.posted_at,
        updates.description,
        id,
      ],
    )
    const savedTransaction = transactionResult.rows[0]
    const appliedEffects = await applyTransactionEffects(
      client,
      userId,
      savedTransaction,
      1,
    )
    const budgetAssignment = await syncBudgetAssignment(
      client,
      userId,
      savedTransaction,
      budgetId,
    )

    return {
      transaction: savedTransaction,
      accounts: [reversedEffects.account, appliedEffects.account],
      accountSummaries: [
        reversedEffects.accountSummary,
        appliedEffects.accountSummary,
      ],
      budgetAssignment,
    }
  })
}

export async function deleteTransaction(userId: string, id: string) {
  return withFinanceTransaction(userId, async (client) => {
    const existingResult = await client.query<TransactionRecord>(
      `
        SELECT user_id, id, account_id, counterparty_id, category_id, concept, amount_cents, posted_at::text, description
        FROM transactions
        WHERE user_id = $1 AND id = $2
      `,
      [userId, id],
    )

    if (!existingResult.rowCount) {
      throw new Error("Transaction not found.")
    }

    const effects = await applyTransactionEffects(
      client,
      userId,
      existingResult.rows[0],
      -1,
    )

    await client.query(
      "DELETE FROM budget_transaction_assignments WHERE user_id = $1 AND transaction_id = $2",
      [userId, id],
    )

    await client.query(
      "DELETE FROM transactions WHERE user_id = $1 AND id = $2",
      [userId, id],
    )

    return {
      id,
      accounts: [effects.account],
      accountSummaries: [effects.accountSummary],
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
            AND b.category_id = t.category_id
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
        "Only matching-category current-month expense transactions can be assigned to budgets.",
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
