import { Pool, type PoolClient } from "pg"

import accountSummariesSeed from "../../data/account-summaries.json"
import accountsSeed from "../../data/accounts.json"
import budgetSummariesSeed from "../../data/budget-summaries.json"
import budgetsSeed from "../../data/budgets.json"
import categoriesSeed from "../../data/categories.json"
import counterpartiesSeed from "../../data/counterparties.json"
import potsSeed from "../../data/pots.json"
import recurringBillsSeed from "../../data/recurring-bills.json"
import transactionsSeed from "../../data/transactions.json"

const demoUserId = accountsSeed[0]?.user_id
const connectionString =
  process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_URL

if (!demoUserId) {
  throw new Error("Seed data must include at least one account with user_id.")
}

if (!connectionString) {
  throw new Error("Set DATABASE_DIRECT_URL or DATABASE_URL before seeding.")
}

const pool = new Pool({ connectionString, max: 1 })

type SeedRow = Record<string, string | number | null>

async function insertRows(
  client: PoolClient,
  table: string,
  columns: string[],
  rows: SeedRow[],
  conflictTarget: string,
  updateColumns: string[],
) {
  if (rows.length === 0) {
    return
  }

  const values: Array<string | number | null> = []
  const placeholders = rows
    .map((row, rowIndex) => {
      const offset = rowIndex * columns.length
      const rowPlaceholders = columns.map((column, columnIndex) => {
        values.push(row[column])
        return `$${offset + columnIndex + 1}`
      })

      return `(${rowPlaceholders.join(", ")})`
    })
    .join(", ")
  const updates = updateColumns
    .map((column) => `${column} = excluded.${column}`)
    .join(", ")
  const conflictAction = updates ? `DO UPDATE SET ${updates}` : "DO NOTHING"

  await client.query(
    `
      INSERT INTO ${table} (${columns.join(", ")})
      VALUES ${placeholders}
      ON CONFLICT ${conflictTarget} ${conflictAction}
    `,
    values,
  )
}

async function seedDemoData(client: PoolClient) {
  await client.query("SELECT set_config('app.current_user_id', $1, true)", [
    demoUserId,
  ])

  await client.query(
    `
      INSERT INTO profiles (user_id, display_name)
      VALUES ($1, $2)
      ON CONFLICT (user_id) DO UPDATE SET display_name = excluded.display_name
    `,
    [demoUserId, "Demo User"],
  )

  await insertRows(
    client,
    "categories",
    ["id", "name", "slug"],
    categoriesSeed,
    "(id)",
    ["name", "slug"],
  )

  await insertRows(
    client,
    "accounts",
    ["user_id", "id", "name", "type", "currency", "current_balance_cents"],
    accountsSeed,
    "(user_id, id)",
    ["name", "type", "currency", "current_balance_cents"],
  )

  await insertRows(
    client,
    "account_summaries",
    ["user_id", "id", "account_id", "period", "income_cents", "expense_cents"],
    accountSummariesSeed,
    "(user_id, id)",
    ["account_id", "period", "income_cents", "expense_cents"],
  )

  await insertRows(
    client,
    "counterparties",
    ["user_id", "id", "display_name", "avatar_url", "type"],
    counterpartiesSeed,
    "(user_id, id)",
    ["display_name", "avatar_url", "type"],
  )

  await insertRows(
    client,
    "transactions",
    [
      "user_id",
      "id",
      "account_id",
      "counterparty_id",
      "category_id",
      "amount_cents",
      "posted_at",
      "description",
    ],
    transactionsSeed,
    "(user_id, id)",
    [
      "account_id",
      "counterparty_id",
      "category_id",
      "amount_cents",
      "posted_at",
      "description",
    ],
  )

  await insertRows(
    client,
    "budgets",
    ["user_id", "id", "category_id", "period", "limit_cents", "theme_color"],
    budgetsSeed,
    "(user_id, id)",
    ["category_id", "period", "limit_cents", "theme_color"],
  )

  await insertRows(
    client,
    "budget_summaries",
    ["user_id", "budget_id", "spent_cents"],
    budgetSummariesSeed,
    "(user_id, budget_id)",
    ["spent_cents"],
  )

  await insertRows(
    client,
    "pots",
    ["user_id", "id", "name", "balance_cents", "target_cents", "theme_color"],
    potsSeed,
    "(user_id, id)",
    ["name", "balance_cents", "target_cents", "theme_color"],
  )

  await insertRows(
    client,
    "recurring_bills",
    [
      "user_id",
      "id",
      "counterparty_id",
      "amount_cents",
      "currency",
      "frequency",
      "due_day_of_month",
      "status",
    ],
    recurringBillsSeed,
    "(user_id, id)",
    [
      "counterparty_id",
      "amount_cents",
      "currency",
      "frequency",
      "due_day_of_month",
      "status",
    ],
  )
}

async function main() {
  const client = await pool.connect()

  try {
    await client.query("BEGIN")
    await seedDemoData(client)
    await client.query("COMMIT")
    console.log("Demo finance data seeded.")
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

void main()
