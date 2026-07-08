import "server-only"

import type { PoolClient } from "pg"

import { withFinanceTransaction } from "@/lib/db/transaction"
import { getCreditCardStatementCycle } from "@/lib/finance/credit-card-cycle"
import type {
  AccountRecord,
  AccountSummaryRecord,
  BudgetRecord,
  BudgetSummaryRecord,
  BudgetTransactionAssignmentRecord,
  CategoryRecord,
  CounterpartyRecord,
  CreditCardPaymentRecord,
  CreditCardRecord,
  CreditCardStatementRecord,
  FinanceState,
  NewCategoryRecord,
  NewCounterpartyRecord,
  NewCreditCardRecord,
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
const transactionSelectColumns = [
  "user_id",
  "id",
  "account_id",
  "counterparty_id",
  "category_id",
  "concept",
  "amount_cents",
  "is_voucher_expense",
  "payment_method",
  "credit_card_id",
  "credit_card_statement_id",
  "posted_at::text AS posted_at",
  "description",
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
const creditCardColumns = [
  "user_id",
  "id",
  "nickname",
  "issuer",
  "network",
  "last_four",
  "expiration_month",
  "expiration_year",
  "credit_limit_cents",
  "closing_day_of_month",
  "payment_due_day_of_month",
  "theme_color",
  "archived_at::text AS archived_at",
]
const creditCardStatementColumns = [
  "user_id",
  "id",
  "credit_card_id",
  "period_start::text AS period_start",
  "period_end::text AS period_end",
  "payment_due_date::text AS payment_due_date",
  "statement_amount_cents",
  "lifecycle_status",
  "paid_at::text AS paid_at",
]
const creditCardPaymentColumns = [
  "user_id",
  "id",
  "credit_card_id",
  "statement_id",
  "source_account_id",
  "cashflow_transaction_id",
  "amount_cents",
  "paid_at::text AS paid_at",
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
      `SELECT ${transactionSelectColumns.join(", ")} FROM transactions WHERE user_id = $1 ORDER BY posted_at DESC, id`,
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
    const creditCards = await client.query<CreditCardRecord>(
      `SELECT ${creditCardColumns.join(", ")} FROM credit_cards WHERE user_id = $1 ORDER BY archived_at NULLS FIRST, created_at, id`,
      [userId],
    )
    const creditCardStatements = await client.query<CreditCardStatementRecord>(
      `SELECT ${creditCardStatementColumns.join(", ")} FROM credit_card_statements WHERE user_id = $1 ORDER BY payment_due_date DESC, id`,
      [userId],
    )
    const creditCardPayments = await client.query<CreditCardPaymentRecord>(
      `SELECT ${creditCardPaymentColumns.join(", ")} FROM credit_card_payments WHERE user_id = $1 ORDER BY paid_at DESC, id`,
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
      creditCards: creditCards.rows,
      creditCardStatements: creditCardStatements.rows,
      creditCardPayments: creditCardPayments.rows,
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
  const period = toPeriod(transaction.posted_at)

  const [account, accountSummary] = await Promise.all([
    applyAccountBalanceEffect(
      client,
      userId,
      transaction.account_id,
      balanceDelta,
    ),
    applyAccountSummaryEffect(client, userId, transaction, period, direction),
  ])

  return {
    account,
    accountSummary,
  }
}

async function applyAccountBalanceEffect(
  client: PoolClient,
  userId: string,
  accountId: string,
  balanceDelta: number,
) {
  const accountResult = await client.query<AccountRecord>(
    `
      UPDATE accounts
      SET current_balance_cents = current_balance_cents + $3
      WHERE user_id = $1 AND id = $2
      RETURNING ${accountColumns.join(", ")}
    `,
    [userId, accountId, balanceDelta],
  )

  if (!accountResult.rowCount) {
    throw new Error("Account not found.")
  }

  return accountResult.rows[0]
}

async function applyAccountSummaryEffect(
  client: PoolClient,
  userId: string,
  transaction: Pick<
    TransactionRecord,
    "account_id" | "amount_cents" | "posted_at"
  >,
  period: string,
  direction: 1 | -1,
) {
  const incomeDelta =
    transaction.amount_cents > 0 ? transaction.amount_cents * direction : 0
  const expenseDelta =
    transaction.amount_cents < 0
      ? Math.abs(transaction.amount_cents) * direction
      : 0

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

  return summaryResult.rows[0]
}

async function applyAccountEffectsIfNeeded(
  client: PoolClient,
  userId: string,
  transaction: TransactionRecord,
  direction: 1 | -1,
) {
  switch (transaction.payment_method) {
    case "voucher":
      return null
    case "credit_card": {
      return {
        account: null,
        accountSummary: await applyAccountSummaryEffect(
          client,
          userId,
          transaction,
          toPeriod(transaction.posted_at),
          direction,
        ),
      }
    }
    case "credit_card_payment":
      return {
        account: await applyAccountBalanceEffect(
          client,
          userId,
          transaction.account_id,
          transaction.amount_cents * direction,
        ),
        accountSummary: null,
      }
    case "bank_account":
      return applyTransactionEffects(client, userId, transaction, direction)
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

async function getCreditCard(
  client: PoolClient,
  userId: string,
  creditCardId: string,
) {
  const result = await client.query<CreditCardRecord>(
    `
      SELECT ${creditCardColumns.join(", ")}
      FROM credit_cards
      WHERE user_id = $1 AND id = $2
    `,
    [userId, creditCardId],
  )

  if (!result.rowCount) {
    throw new Error("Credit card not found.")
  }

  const card = result.rows[0]

  if (card.archived_at) {
    throw new Error("This credit card is archived.")
  }

  return card
}

async function ensureOpenCreditCardStatement(
  client: PoolClient,
  userId: string,
  card: CreditCardRecord,
  postedAt: string,
) {
  const cycle = getCreditCardStatementCycle(postedAt, card)
  const result = await client.query<CreditCardStatementRecord>(
    `
      INSERT INTO credit_card_statements (
        user_id,
        credit_card_id,
        period_start,
        period_end,
        payment_due_date,
        lifecycle_status
      )
      VALUES ($1, $2, $3, $4, $5, 'open')
      ON CONFLICT (user_id, credit_card_id, period_start, period_end)
      DO UPDATE SET payment_due_date = excluded.payment_due_date
      RETURNING ${creditCardStatementColumns.join(", ")}
    `,
    [userId, card.id, cycle.periodStart, cycle.periodEnd, cycle.paymentDueDate],
  )
  const statement = result.rows[0]

  if (statement.lifecycle_status === "paid") {
    throw new Error(
      "This purchase belongs to a paid card statement. Create an adjustment in the current statement instead.",
    )
  }

  return statement
}

async function prepareTransactionPaymentMethod(
  client: PoolClient,
  userId: string,
  transaction: NewTransactionRecord,
): Promise<NewTransactionRecord> {
  const paymentMethod =
    transaction.is_voucher_expense &&
    transaction.payment_method === "bank_account"
      ? "voucher"
      : transaction.payment_method

  switch (paymentMethod) {
    case "bank_account":
      return {
        ...transaction,
        payment_method: paymentMethod,
        is_voucher_expense: false,
        credit_card_id: null,
        credit_card_statement_id: null,
      }
    case "voucher":
      return {
        ...transaction,
        payment_method: paymentMethod,
        is_voucher_expense: true,
        credit_card_id: null,
        credit_card_statement_id: null,
      }
    case "credit_card": {
      if (!transaction.credit_card_id) {
        throw new Error("Choose a credit card for this transaction.")
      }

      if (transaction.amount_cents >= 0) {
        throw new Error("Credit card purchases can only be expenses.")
      }

      const card = await getCreditCard(
        client,
        userId,
        transaction.credit_card_id,
      )
      const statement = await ensureOpenCreditCardStatement(
        client,
        userId,
        card,
        transaction.posted_at,
      )

      return {
        ...transaction,
        payment_method: paymentMethod,
        is_voucher_expense: false,
        credit_card_id: card.id,
        credit_card_statement_id: statement.id,
      }
    }
    case "credit_card_payment":
      return {
        ...transaction,
        payment_method: paymentMethod,
        is_voucher_expense: false,
      }
  }
}

async function applyCreditCardStatementEffectIfNeeded(
  client: PoolClient,
  userId: string,
  transaction: TransactionRecord,
  direction: 1 | -1,
) {
  if (transaction.payment_method !== "credit_card") {
    return null
  }

  if (!transaction.credit_card_statement_id) {
    throw new Error("Credit card statement not found.")
  }

  const result = await client.query<CreditCardStatementRecord>(
    `
      UPDATE credit_card_statements
      SET statement_amount_cents = statement_amount_cents + $3
      WHERE user_id = $1
        AND id = $2
        AND lifecycle_status <> 'paid'
      RETURNING ${creditCardStatementColumns.join(", ")}
    `,
    [
      userId,
      transaction.credit_card_statement_id,
      Math.abs(transaction.amount_cents) * direction,
    ],
  )

  if (!result.rowCount) {
    throw new Error(
      "This purchase belongs to a paid card statement. Create an adjustment in the current statement instead.",
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
    const preparedTransaction = await prepareTransactionPaymentMethod(
      client,
      userId,
      transaction,
    )
    await assertUserRecord(
      client,
      "accounts",
      userId,
      preparedTransaction.account_id,
      "Account",
    )
    await assertUserRecord(
      client,
      "categories",
      userId,
      preparedTransaction.category_id,
      "Category",
    )
    await assertUserRecord(
      client,
      "counterparties",
      userId,
      preparedTransaction.counterparty_id,
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
          is_voucher_expense,
          payment_method,
          credit_card_id,
          credit_card_statement_id,
          posted_at,
          description
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING ${transactionSelectColumns.join(", ")}
      `,
      [
        userId,
        preparedTransaction.id,
        preparedTransaction.account_id,
        preparedTransaction.counterparty_id,
        preparedTransaction.category_id,
        preparedTransaction.concept,
        preparedTransaction.amount_cents,
        preparedTransaction.is_voucher_expense,
        preparedTransaction.payment_method,
        preparedTransaction.credit_card_id,
        preparedTransaction.credit_card_statement_id,
        preparedTransaction.posted_at,
        preparedTransaction.description,
      ],
    )
    const savedTransaction = transactionResult.rows[0]
    const effects = await applyAccountEffectsIfNeeded(
      client,
      userId,
      savedTransaction,
      1,
    )
    const creditCardStatement = await applyCreditCardStatementEffectIfNeeded(
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
      accounts: effects?.account ? [effects.account] : [],
      accountSummaries: effects?.accountSummary ? [effects.accountSummary] : [],
      creditCardStatements: creditCardStatement ? [creditCardStatement] : [],
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
        SELECT ${transactionSelectColumns.join(", ")}
        FROM transactions
        WHERE user_id = $1 AND id = $2
      `,
      [userId, id],
    )

    if (!existingResult.rowCount) {
      throw new Error("Transaction not found.")
    }

    const preparedUpdates = await prepareTransactionPaymentMethod(
      client,
      userId,
      { id, ...updates },
    )
    await assertUserRecord(
      client,
      "accounts",
      userId,
      preparedUpdates.account_id,
      "Account",
    )
    await assertUserRecord(
      client,
      "categories",
      userId,
      preparedUpdates.category_id,
      "Category",
    )
    await assertUserRecord(
      client,
      "counterparties",
      userId,
      preparedUpdates.counterparty_id,
      "Contact",
    )

    const reversedEffects = await applyAccountEffectsIfNeeded(
      client,
      userId,
      existingResult.rows[0],
      -1,
    )
    const reversedStatement = await applyCreditCardStatementEffectIfNeeded(
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
          is_voucher_expense = $7,
          payment_method = $8,
          credit_card_id = $9,
          credit_card_statement_id = $10,
          posted_at = $11,
          description = $12
        WHERE user_id = $1 AND id = $13
        RETURNING ${transactionSelectColumns.join(", ")}
      `,
      [
        userId,
        preparedUpdates.account_id,
        preparedUpdates.counterparty_id,
        preparedUpdates.category_id,
        preparedUpdates.concept,
        preparedUpdates.amount_cents,
        preparedUpdates.is_voucher_expense,
        preparedUpdates.payment_method,
        preparedUpdates.credit_card_id,
        preparedUpdates.credit_card_statement_id,
        preparedUpdates.posted_at,
        preparedUpdates.description,
        id,
      ],
    )
    const savedTransaction = transactionResult.rows[0]
    const appliedEffects = await applyAccountEffectsIfNeeded(
      client,
      userId,
      savedTransaction,
      1,
    )
    const appliedStatement = await applyCreditCardStatementEffectIfNeeded(
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
      accounts: [
        ...(reversedEffects?.account ? [reversedEffects.account] : []),
        ...(appliedEffects?.account ? [appliedEffects.account] : []),
      ],
      accountSummaries: [
        ...(reversedEffects?.accountSummary
          ? [reversedEffects.accountSummary]
          : []),
        ...(appliedEffects?.accountSummary
          ? [appliedEffects.accountSummary]
          : []),
      ],
      creditCardStatements: [
        ...(reversedStatement ? [reversedStatement] : []),
        ...(appliedStatement ? [appliedStatement] : []),
      ],
      budgetAssignment,
    }
  })
}

export async function deleteTransaction(userId: string, id: string) {
  return withFinanceTransaction(userId, async (client) => {
    const existingResult = await client.query<TransactionRecord>(
      `
        SELECT ${transactionSelectColumns.join(", ")}
        FROM transactions
        WHERE user_id = $1 AND id = $2
      `,
      [userId, id],
    )

    if (!existingResult.rowCount) {
      throw new Error("Transaction not found.")
    }

    const effects = await applyAccountEffectsIfNeeded(
      client,
      userId,
      existingResult.rows[0],
      -1,
    )
    const creditCardStatement = await applyCreditCardStatementEffectIfNeeded(
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
      accounts: effects?.account ? [effects.account] : [],
      accountSummaries: effects?.accountSummary ? [effects.accountSummary] : [],
      creditCardStatements: creditCardStatement ? [creditCardStatement] : [],
    }
  })
}

export async function insertCreditCard(
  userId: string,
  creditCard: NewCreditCardRecord,
) {
  return withFinanceTransaction(userId, async (client) => {
    const result = await client.query<CreditCardRecord>(
      `
        INSERT INTO credit_cards (
          user_id,
          id,
          nickname,
          issuer,
          network,
          last_four,
          expiration_month,
          expiration_year,
          credit_limit_cents,
          closing_day_of_month,
          payment_due_day_of_month,
          theme_color,
          archived_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING ${creditCardColumns.join(", ")}
      `,
      [
        userId,
        creditCard.id,
        creditCard.nickname,
        creditCard.issuer,
        creditCard.network,
        creditCard.last_four,
        creditCard.expiration_month,
        creditCard.expiration_year,
        creditCard.credit_limit_cents,
        creditCard.closing_day_of_month,
        creditCard.payment_due_day_of_month,
        creditCard.theme_color,
        creditCard.archived_at,
      ],
    )

    return result.rows[0]
  })
}

export async function updateCreditCard(
  userId: string,
  id: string,
  updates: Partial<Omit<CreditCardRecord, "id" | "user_id">>,
) {
  return withFinanceTransaction(userId, async (client) => {
    const result = await client.query<CreditCardRecord>(
      `
        UPDATE credit_cards
        SET
          nickname = COALESCE($2, nickname),
          issuer = COALESCE($3, issuer),
          network = COALESCE($4, network),
          last_four = COALESCE($5, last_four),
          expiration_month = COALESCE($6, expiration_month),
          expiration_year = COALESCE($7, expiration_year),
          credit_limit_cents = COALESCE($8, credit_limit_cents),
          closing_day_of_month = COALESCE($9, closing_day_of_month),
          payment_due_day_of_month = COALESCE($10, payment_due_day_of_month),
          theme_color = COALESCE($11, theme_color),
          archived_at = CASE WHEN $12::boolean THEN $13::timestamptz ELSE archived_at END
        WHERE user_id = $1 AND id = $14
        RETURNING ${creditCardColumns.join(", ")}
      `,
      [
        userId,
        updates.nickname ?? null,
        updates.issuer ?? null,
        updates.network ?? null,
        updates.last_four ?? null,
        updates.expiration_month ?? null,
        updates.expiration_year ?? null,
        updates.credit_limit_cents ?? null,
        updates.closing_day_of_month ?? null,
        updates.payment_due_day_of_month ?? null,
        updates.theme_color ?? null,
        updates.archived_at !== undefined,
        updates.archived_at ?? null,
        id,
      ],
    )

    if (!result.rowCount) {
      throw new Error("Credit card not found.")
    }

    return result.rows[0]
  })
}

async function getDefaultPaymentCategory(client: PoolClient, userId: string) {
  const result = await client.query<CategoryRecord>(
    `
      SELECT ${categoryColumns.join(", ")}
      FROM categories
      WHERE user_id = $1 AND name IN ('Bills', 'General')
      ORDER BY CASE name WHEN 'Bills' THEN 0 ELSE 1 END
      LIMIT 1
    `,
    [userId],
  )

  if (!result.rowCount) {
    throw new Error("Create a Bills or General category before paying cards.")
  }

  return result.rows[0]
}

async function ensureCardPaymentCounterparty(
  client: PoolClient,
  userId: string,
  card: CreditCardRecord,
) {
  const displayName = `${card.nickname} Payment`
  const existing = await client.query<CounterpartyRecord>(
    `
      SELECT ${counterpartyColumns.join(", ")}
      FROM counterparties
      WHERE user_id = $1 AND lower(display_name) = lower($2)
      LIMIT 1
    `,
    [userId, displayName],
  )

  if (existing.rowCount) {
    return existing.rows[0]
  }

  const result = await client.query<CounterpartyRecord>(
    `
      INSERT INTO counterparties (
        user_id,
        display_name,
        avatar_url,
        type,
        theme_color,
        notes
      )
      VALUES ($1, $2, NULL, 'merchant', $3, $4)
      RETURNING ${counterpartyColumns.join(", ")}
    `,
    [
      userId,
      displayName,
      card.theme_color,
      "Created automatically for credit card payments.",
    ],
  )

  return result.rows[0]
}

export async function payCreditCardStatement(
  userId: string,
  statementId: string,
  paidAt: string,
) {
  return withFinanceTransaction(userId, async (client) => {
    const statementResult = await client.query<CreditCardStatementRecord>(
      `
        SELECT ${creditCardStatementColumns.join(", ")}
        FROM credit_card_statements
        WHERE user_id = $1 AND id = $2
        FOR UPDATE
      `,
      [userId, statementId],
    )

    if (!statementResult.rowCount) {
      throw new Error("Credit card statement not found.")
    }

    const statement = statementResult.rows[0]

    if (statement.lifecycle_status === "paid") {
      throw new Error("This statement has already been paid.")
    }

    if (statement.statement_amount_cents <= 0) {
      throw new Error("This statement does not have a balance to pay.")
    }

    const card = await getCreditCard(client, userId, statement.credit_card_id)
    const accountResult = await client.query<AccountRecord>(
      `
        SELECT ${accountColumns.join(", ")}
        FROM accounts
        WHERE user_id = $1 AND type IN ('checking', 'savings')
        ORDER BY id
        LIMIT 1
      `,
      [userId],
    )

    if (!accountResult.rowCount) {
      throw new Error("Your payment account is not ready yet.")
    }

    const sourceAccount = accountResult.rows[0]
    const category = await getDefaultPaymentCategory(client, userId)
    const counterparty = await ensureCardPaymentCounterparty(
      client,
      userId,
      card,
    )
    const cashflowTransaction: NewTransactionRecord = {
      id: crypto.randomUUID(),
      account_id: sourceAccount.id,
      counterparty_id: counterparty.id,
      category_id: category.id,
      concept: `Pay ${card.nickname} statement`,
      amount_cents: statement.statement_amount_cents * -1,
      is_voucher_expense: false,
      payment_method: "credit_card_payment",
      credit_card_id: card.id,
      credit_card_statement_id: statement.id,
      posted_at: paidAt,
      description: `Payment for ${statement.period_start} to ${statement.period_end}.`,
    }
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
          is_voucher_expense,
          payment_method,
          credit_card_id,
          credit_card_statement_id,
          posted_at,
          description
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING ${transactionSelectColumns.join(", ")}
      `,
      [
        userId,
        cashflowTransaction.id,
        cashflowTransaction.account_id,
        cashflowTransaction.counterparty_id,
        cashflowTransaction.category_id,
        cashflowTransaction.concept,
        cashflowTransaction.amount_cents,
        cashflowTransaction.is_voucher_expense,
        cashflowTransaction.payment_method,
        cashflowTransaction.credit_card_id,
        cashflowTransaction.credit_card_statement_id,
        cashflowTransaction.posted_at,
        cashflowTransaction.description,
      ],
    )
    const savedTransaction = transactionResult.rows[0]
    const effects = await applyAccountEffectsIfNeeded(
      client,
      userId,
      savedTransaction,
      1,
    )
    const paidStatementResult = await client.query<CreditCardStatementRecord>(
      `
        UPDATE credit_card_statements
        SET lifecycle_status = 'paid', paid_at = now()
        WHERE user_id = $1 AND id = $2
        RETURNING ${creditCardStatementColumns.join(", ")}
      `,
      [userId, statement.id],
    )
    const paymentResult = await client.query<CreditCardPaymentRecord>(
      `
        INSERT INTO credit_card_payments (
          user_id,
          credit_card_id,
          statement_id,
          source_account_id,
          cashflow_transaction_id,
          amount_cents,
          paid_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING ${creditCardPaymentColumns.join(", ")}
      `,
      [
        userId,
        card.id,
        statement.id,
        sourceAccount.id,
        savedTransaction.id,
        statement.statement_amount_cents,
        paidAt,
      ],
    )

    return {
      payment: paymentResult.rows[0],
      transaction: savedTransaction,
      accounts: effects?.account ? [effects.account] : [],
      statement: paidStatementResult.rows[0],
    }
  })
}

export async function closeZeroBalanceCreditCardStatement(
  userId: string,
  statementId: string,
) {
  return withFinanceTransaction(userId, async (client) => {
    const statementResult = await client.query<CreditCardStatementRecord>(
      `
        SELECT ${creditCardStatementColumns.join(", ")}
        FROM credit_card_statements
        WHERE user_id = $1 AND id = $2
        FOR UPDATE
      `,
      [userId, statementId],
    )

    if (!statementResult.rowCount) {
      throw new Error("Credit card statement not found.")
    }

    const statement = statementResult.rows[0]

    if (statement.lifecycle_status === "paid") {
      throw new Error("This statement is already closed.")
    }

    if (statement.statement_amount_cents > 0) {
      throw new Error("This statement has a balance. Pay it instead.")
    }

    const closedStatementResult = await client.query<CreditCardStatementRecord>(
      `
          UPDATE credit_card_statements
          SET lifecycle_status = 'paid', paid_at = now()
          WHERE user_id = $1 AND id = $2
          RETURNING ${creditCardStatementColumns.join(", ")}
        `,
      [userId, statement.id],
    )

    return closedStatementResult.rows[0]
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
