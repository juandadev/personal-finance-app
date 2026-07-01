"use server"

import { z } from "zod"

import { auth } from "@/lib/auth/server"
import {
  assignTransactionToBudget,
  deleteBudget,
  deletePot,
  insertBudget,
  insertPot,
  transferPotBalance,
  unassignTransactionFromBudget,
  updateBudget,
  updatePot,
} from "@/lib/finance/queries"
import { isFutureISODate } from "@/lib/finance/pot-due-date"
import type {
  BudgetRecord,
  BudgetSummaryRecord,
  BudgetTransactionAssignmentRecord,
  NewBudgetRecord,
  NewPotRecord,
  PotRecord,
} from "@/lib/finance/types"
import { themeColorClasses } from "@/lib/theme-colors"

type FinanceActionResult<T = undefined> =
  | {
      ok: true
      message: string
      data: T
    }
  | {
      ok: false
      message: string
      fieldErrors?: Record<string, string[] | undefined>
    }

const themeColorSchema = z.enum(
  Object.keys(themeColorClasses) as [
    keyof typeof themeColorClasses,
    ...(keyof typeof themeColorClasses)[],
  ],
)
const recordIdSchema = z.string().uuid()

const budgetSchema = z.object({
  id: recordIdSchema,
  user_id: z.string().min(1),
  category_id: recordIdSchema,
  period: z.string().regex(/^\d{4}-\d{2}$/),
  limit_cents: z.number().int().positive(),
  theme_color: themeColorSchema,
})

const budgetUpdateSchema = z.object({
  category_id: recordIdSchema.optional(),
  period: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
  limit_cents: z.number().int().positive().optional(),
  theme_color: themeColorSchema.optional(),
})

const potDueDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid due date.")
  .refine((value) => isFutureISODate(value), "Choose a future due date.")
  .nullable()

const potSchema = z.object({
  id: recordIdSchema,
  user_id: z.string().min(1),
  name: z.string().trim().min(1).max(30),
  balance_cents: z.number().int().min(0),
  target_cents: z.number().int().positive(),
  theme_color: themeColorSchema,
  due_date: potDueDateSchema,
})

const potUpdateSchema = z.object({
  name: z.string().trim().min(1).max(30).optional(),
  balance_cents: z.number().int().min(0).optional(),
  target_cents: z.number().int().positive().optional(),
  theme_color: themeColorSchema.optional(),
  due_date: potDueDateSchema.optional(),
})

const idSchema = recordIdSchema
const amountSchema = z.number().int().positive()

async function getUserId() {
  const { data: session } = await auth.getSession()

  if (!session?.user?.id) {
    throw new Error("You must be logged in to update finance data.")
  }

  return session.user.id
}

interface PostgresError extends Error {
  code: string
  constraint?: string
}

function isPostgresError(error: unknown): error is PostgresError {
  return (
    error instanceof Error &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  )
}

// Postgres constraint names for known uniqueness rules, mapped to copy a user
// can act on instead of raw SQL ("duplicate key value violates unique...").
const uniqueConstraintMessages: Record<string, string> = {
  pots_user_name_unique: "A pot with this name already exists.",
  budgets_user_id_category_id_period_key:
    "This category already has a budget for this period.",
}

function handlePostgresError<T>(error: PostgresError): FinanceActionResult<T> {
  switch (error.code) {
    case "23505": {
      const message = error.constraint
        ? uniqueConstraintMessages[error.constraint]
        : undefined

      return {
        ok: false,
        message: message ?? "That already exists. Try a different value.",
      }
    }
    case "23503":
      return {
        ok: false,
        message:
          "Your account isn't fully set up yet. Refresh the page and try again.",
      }
    case "23514":
      return {
        ok: false,
        message: "Check the highlighted fields and try again.",
      }
    default:
      return {
        ok: false,
        message: "Something went wrong while saving. Try again in a moment.",
      }
  }
}

function handleFinanceActionError<T>(error: unknown): FinanceActionResult<T> {
  if (error instanceof z.ZodError) {
    return {
      ok: false,
      message: "Check the highlighted fields and try again.",
      fieldErrors: error.flatten().fieldErrors,
    }
  }

  if (isPostgresError(error)) {
    return handlePostgresError(error)
  }

  if (error instanceof Error) {
    return {
      ok: false,
      message: error.message,
    }
  }

  return {
    ok: false,
    message: "Something went wrong. Try again in a moment.",
  }
}

export async function createBudgetAction(
  budget: NewBudgetRecord,
  spentCents = 0,
): Promise<
  FinanceActionResult<{
    budget: BudgetRecord
    budgetSummary: BudgetSummaryRecord
  }>
> {
  try {
    const userId = await getUserId()
    const parsedBudget = budgetSchema.parse({ ...budget, user_id: userId })
    const parsedSpentCents = z.number().int().min(0).parse(spentCents)
    const data = await insertBudget(userId, parsedBudget, parsedSpentCents)

    return {
      ok: true,
      message: "Budget created.",
      data,
    }
  } catch (error) {
    return handleFinanceActionError(error)
  }
}

export async function updateBudgetAction(
  id: string,
  updates: Partial<Omit<BudgetRecord, "id" | "user_id">>,
  spentCents?: number,
): Promise<
  FinanceActionResult<{
    budget: BudgetRecord
    budgetSummary: BudgetSummaryRecord | null
  }>
> {
  try {
    const userId = await getUserId()
    const parsedId = idSchema.parse(id)
    const parsedUpdates = budgetUpdateSchema.parse(updates)
    const parsedSpentCents =
      spentCents === undefined
        ? undefined
        : z.number().int().min(0).parse(spentCents)
    const data = await updateBudget(
      userId,
      parsedId,
      parsedUpdates,
      parsedSpentCents,
    )

    return {
      ok: true,
      message: "Budget updated.",
      data,
    }
  } catch (error) {
    return handleFinanceActionError(error)
  }
}

export async function deleteBudgetAction(
  id: string,
): Promise<FinanceActionResult> {
  try {
    const userId = await getUserId()
    const parsedId = idSchema.parse(id)
    await deleteBudget(userId, parsedId)

    return {
      ok: true,
      message: "Budget deleted.",
      data: undefined,
    }
  } catch (error) {
    return handleFinanceActionError(error)
  }
}

export async function assignTransactionToBudgetAction(
  transactionId: string,
  budgetId: string,
): Promise<FinanceActionResult<BudgetTransactionAssignmentRecord>> {
  try {
    const userId = await getUserId()
    const parsedTransactionId = idSchema.parse(transactionId)
    const parsedBudgetId = idSchema.parse(budgetId)
    const data = await assignTransactionToBudget(
      userId,
      parsedTransactionId,
      parsedBudgetId,
    )

    return {
      ok: true,
      message: "Transaction assigned to budget.",
      data,
    }
  } catch (error) {
    return handleFinanceActionError(error)
  }
}

export async function unassignTransactionFromBudgetAction(
  transactionId: string,
): Promise<FinanceActionResult<BudgetTransactionAssignmentRecord | null>> {
  try {
    const userId = await getUserId()
    const parsedTransactionId = idSchema.parse(transactionId)
    const data = await unassignTransactionFromBudget(
      userId,
      parsedTransactionId,
    )

    return {
      ok: true,
      message: "Transaction removed from budget.",
      data,
    }
  } catch (error) {
    return handleFinanceActionError(error)
  }
}

export async function createPotAction(
  pot: NewPotRecord,
): Promise<FinanceActionResult<PotRecord>> {
  try {
    const userId = await getUserId()
    const parsedPot = potSchema.parse({ ...pot, user_id: userId })
    const data = await insertPot(userId, parsedPot)

    return {
      ok: true,
      message: "Pot created.",
      data,
    }
  } catch (error) {
    return handleFinanceActionError(error)
  }
}

export async function updatePotAction(
  id: string,
  updates: Partial<Omit<PotRecord, "id" | "user_id">>,
): Promise<FinanceActionResult<PotRecord>> {
  try {
    const userId = await getUserId()
    const parsedId = idSchema.parse(id)
    const parsedUpdates = potUpdateSchema.parse(updates)
    const data = await updatePot(userId, parsedId, parsedUpdates)

    return {
      ok: true,
      message: "Pot updated.",
      data,
    }
  } catch (error) {
    return handleFinanceActionError(error)
  }
}

export async function transferPotAction(
  id: string,
  amountCents: number,
  mode: "deposit" | "withdraw",
): Promise<FinanceActionResult<PotRecord>> {
  try {
    const userId = await getUserId()
    const parsedId = idSchema.parse(id)
    const parsedAmountCents = amountSchema.parse(amountCents)
    const data = await transferPotBalance(
      userId,
      parsedId,
      parsedAmountCents,
      mode,
    )

    return {
      ok: true,
      message: mode === "deposit" ? "Money added." : "Money withdrawn.",
      data,
    }
  } catch (error) {
    return handleFinanceActionError(error)
  }
}

export async function deletePotAction(
  id: string,
): Promise<FinanceActionResult> {
  try {
    const userId = await getUserId()
    const parsedId = idSchema.parse(id)
    await deletePot(userId, parsedId)

    return {
      ok: true,
      message: "Pot deleted.",
      data: undefined,
    }
  } catch (error) {
    return handleFinanceActionError(error)
  }
}
