import type { TransactionFilters } from "@/lib/finance/url-filters/normalize"
import type { ThemeColor } from "@/lib/theme-colors"

export const TRANSACTION_PAGE_SIZE = 10

export type TransactionFilterOption = {
  value: string
  label: string
}

export type TransactionPageRow = {
  id: string
  account_id: string
  counterparty_id: string
  category_id: string
  concept: string
  amount_cents: number
  is_voucher_expense: boolean
  payment_method:
    "bank_account" | "credit_card" | "voucher" | "credit_card_payment"
  credit_card_id: string | null
  credit_card_statement_id: string | null
  posted_at: string
  description: string | null
  created_at: string
  counterparty_name: string
  counterparty_avatar_url: string | null
  counterparty_theme_color: ThemeColor
  category_name: string
  credit_card_nickname: string | null
  credit_card_last_four: string | null
  budget_id: string | null
  budget_category_name: string | null
}

export const transactionPageFromSql = `
  FROM transactions t
  JOIN counterparties cp
    ON cp.user_id = t.user_id
    AND cp.id = t.counterparty_id
  JOIN categories category
    ON category.user_id = t.user_id
    AND category.id = t.category_id
  LEFT JOIN credit_cards card
    ON card.user_id = t.user_id
    AND card.id = t.credit_card_id
  LEFT JOIN budget_transaction_assignments assignment
    ON assignment.user_id = t.user_id
    AND assignment.transaction_id = t.id
  LEFT JOIN budgets budget
    ON budget.user_id = assignment.user_id
    AND budget.id = assignment.budget_id
  LEFT JOIN categories budget_category
    ON budget_category.user_id = budget.user_id
    AND budget_category.id = budget.category_id
`

export const transactionPageSelectSql = `
  SELECT
    t.id,
    t.account_id,
    t.counterparty_id,
    t.category_id,
    t.concept,
    t.amount_cents,
    t.is_voucher_expense,
    t.payment_method,
    t.credit_card_id,
    t.credit_card_statement_id,
    t.posted_at::text AS posted_at,
    t.description,
    t.created_at::text AS created_at,
    cp.display_name AS counterparty_name,
    cp.avatar_url AS counterparty_avatar_url,
    cp.theme_color AS counterparty_theme_color,
    category.name AS category_name,
    card.nickname AS credit_card_nickname,
    card.last_four AS credit_card_last_four,
    assignment.budget_id,
    budget_category.name AS budget_category_name
`

type TransactionQueryParts = {
  whereSql: string
  orderBySql: string
  values: unknown[]
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function validUuids(values: string[]) {
  return values.filter((value) => UUID_PATTERN.test(value))
}

function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, "\\$&")
}

function getOrderBySql(sort: TransactionFilters["sort"]) {
  switch (sort) {
    case "latest":
      return "t.posted_at DESC, t.created_at DESC, t.id"
    case "oldest":
      return "t.posted_at, t.created_at, t.id"
    case "a-z":
      return "lower(cp.display_name), t.created_at DESC, t.id"
    case "z-a":
      return "lower(cp.display_name) DESC, t.created_at DESC, t.id"
    case "highest":
      return "t.amount_cents DESC, t.created_at DESC, t.id"
    case "lowest":
      return "t.amount_cents, t.created_at DESC, t.id"
  }
}

export function buildTransactionQueryParts(
  userId: string,
  filters: TransactionFilters,
): TransactionQueryParts {
  const values: unknown[] = [userId]
  const clauses = ["t.user_id = $1"]
  const addValue = (value: unknown) => {
    values.push(value)
    return `$${values.length}`
  }
  const addUuidList = (column: string, candidates: string[]) => {
    if (candidates.length === 0) {
      return
    }

    const ids = validUuids(candidates)

    if (ids.length === 0) {
      clauses.push("FALSE")
      return
    }

    clauses.push(`${column} = ANY(${addValue(ids)}::uuid[])`)
  }

  if (filters.q) {
    const search = addValue(`%${escapeLikePattern(filters.q)}%`)
    clauses.push(
      `(cp.display_name ILIKE ${search} ESCAPE '\\' OR t.concept ILIKE ${search} ESCAPE '\\' OR t.description ILIKE ${search} ESCAPE '\\')`,
    )
  }

  addUuidList("t.category_id", filters.category)
  addUuidList("t.account_id", filters.account)
  addUuidList("t.counterparty_id", filters.counterparty)
  addUuidList("t.credit_card_id", filters.card)

  if (filters.budget.length > 0) {
    const includesUnassigned = filters.budget.includes("unassigned")
    const budgetIds = validUuids(
      filters.budget.filter((value) => value !== "unassigned"),
    )

    if (budgetIds.length > 0 && includesUnassigned) {
      const ids = addValue(budgetIds)
      clauses.push(
        `(assignment.budget_id = ANY(${ids}::uuid[]) OR assignment.budget_id IS NULL)`,
      )
    } else if (budgetIds.length > 0) {
      clauses.push(`assignment.budget_id = ANY(${addValue(budgetIds)}::uuid[])`)
    } else if (includesUnassigned) {
      clauses.push("assignment.budget_id IS NULL")
    } else {
      clauses.push("FALSE")
    }
  }

  if (filters.method.length > 0) {
    clauses.push(`t.payment_method = ANY(${addValue(filters.method)}::text[])`)
  }

  if (filters.direction === "income") {
    clauses.push("t.amount_cents > 0")
  } else if (filters.direction === "expense") {
    clauses.push("t.amount_cents < 0")
  }

  if (filters.dateRange.from) {
    clauses.push(`t.posted_at >= ${addValue(filters.dateRange.from)}::date`)
  }

  if (filters.dateRange.to) {
    clauses.push(`t.posted_at <= ${addValue(filters.dateRange.to)}::date`)
  }

  if (filters.amountRange.min !== undefined) {
    clauses.push(
      `abs(t.amount_cents) >= ${addValue(Math.round(filters.amountRange.min * 100))}::integer`,
    )
  }

  if (filters.amountRange.max !== undefined) {
    clauses.push(
      `abs(t.amount_cents) <= ${addValue(Math.round(filters.amountRange.max * 100))}::integer`,
    )
  }

  return {
    whereSql: `WHERE ${clauses.join("\n    AND ")}`,
    orderBySql: `ORDER BY ${getOrderBySql(filters.sort)}`,
    values,
  }
}

export function getTransactionPageBounds(
  totalCount: number,
  requestedPage: number,
  pageSize = TRANSACTION_PAGE_SIZE,
) {
  const totalPages = Math.ceil(Math.max(0, totalCount) / pageSize)
  const safePage =
    totalPages === 0 ? 1 : Math.min(Math.max(1, requestedPage), totalPages)

  return {
    pageSize,
    safePage,
    totalPages,
    offset: (safePage - 1) * pageSize,
  }
}
