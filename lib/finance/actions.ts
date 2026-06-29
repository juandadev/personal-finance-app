"use server"

import { z } from "zod"

import { auth } from "@/lib/auth/server"
import {
  deleteBudget,
  deletePot,
  insertBudget,
  insertPot,
  transferPotBalance,
  updateBudget,
  updatePot,
} from "@/lib/finance/queries"
import type {
  BudgetRecord,
  BudgetSummaryRecord,
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

const potSchema = z.object({
  id: recordIdSchema,
  user_id: z.string().min(1),
  name: z.string().trim().min(1).max(30),
  balance_cents: z.number().int().min(0),
  target_cents: z.number().int().positive(),
  theme_color: themeColorSchema,
})

const potUpdateSchema = z.object({
  name: z.string().trim().min(1).max(30).optional(),
  balance_cents: z.number().int().min(0).optional(),
  target_cents: z.number().int().positive().optional(),
  theme_color: themeColorSchema.optional(),
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

function handleFinanceActionError<T>(error: unknown): FinanceActionResult<T> {
  if (error instanceof z.ZodError) {
    return {
      ok: false,
      message: "Check the highlighted fields and try again.",
      fieldErrors: error.flatten().fieldErrors,
    }
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
