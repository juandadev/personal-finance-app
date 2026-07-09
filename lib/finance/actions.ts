"use server"

import { z } from "zod"

import { auth } from "@/lib/auth/server"
import {
  archiveRecurringBill,
  assignTransactionToBudget,
  closeZeroBalanceCreditCardStatement,
  deleteBudget,
  deleteCategory,
  deleteCounterparty,
  deletePot,
  deleteRecurringBill,
  deleteTransaction,
  insertBudget,
  insertCategory,
  insertCounterparty,
  insertCreditCard,
  insertPot,
  insertRecurringBill,
  insertTransaction,
  payCreditCardCycle,
  payCreditCardStatement,
  payRecurringBillOccurrence,
  skipRecurringBillOccurrence,
  transferPotBalance,
  unassignTransactionFromBudget,
  updateBudget,
  updateCategory,
  updateCounterparty,
  updateCreditCard,
  updatePot,
  updateRecurringBill,
  updateTransaction,
} from "@/lib/finance/queries"
import { isFutureISODate } from "@/lib/finance/pot-due-date"
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
  NewBudgetRecord,
  NewCategoryRecord,
  NewCounterpartyRecord,
  NewCreditCardRecord,
  NewPotRecord,
  NewRecurringBillRecord,
  NewTransactionRecord,
  PotRecord,
  RecurringBillPaymentRecord,
  RecurringBillPaymentSource,
  RecurringBillRecord,
  TransactionRecord,
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

const nameSchema = z.string().trim().min(1).max(60)
const categoryNameSchema = z.string().trim().min(1).max(40)
const optionalNotesSchema = z
  .string()
  .trim()
  .max(240)
  .transform((value) => (value ? value : null))
  .nullable()

const categorySchema = z.object({
  id: recordIdSchema,
  name: categoryNameSchema,
  theme_color: themeColorSchema,
})

const categoryUpdateSchema = z.object({
  name: categoryNameSchema.optional(),
  theme_color: themeColorSchema.optional(),
})

const counterpartySchema = z.object({
  id: recordIdSchema,
  display_name: nameSchema,
  type: z.enum(["person", "merchant"]),
  theme_color: themeColorSchema,
  notes: optionalNotesSchema,
})

const counterpartyUpdateSchema = z.object({
  display_name: nameSchema.optional(),
  type: z.enum(["person", "merchant"]).optional(),
  theme_color: themeColorSchema.optional(),
  notes: optionalNotesSchema.optional(),
})

const cardTextSchema = z.string().trim().min(1).max(40)
const creditCardSchema = z.object({
  id: recordIdSchema,
  nickname: cardTextSchema,
  issuer: cardTextSchema,
  network: z.enum(["Visa", "Master Card", "American Express"]),
  last_four: z.string().regex(/^\d{4}$/, "Enter the last 4 digits only."),
  expiration_month: z.number().int().min(1).max(12),
  expiration_year: z
    .number()
    .int()
    .min(new Date().getFullYear(), "Choose a current or future year.")
    .max(2100),
  credit_limit_cents: z.number().int().positive(),
  closing_day_of_month: z.number().int().min(1).max(31),
  payment_due_day_of_month: z.number().int().min(1).max(31),
  theme_color: themeColorSchema,
  archived_at: z.string().nullable(),
})
const creditCardUpdateSchema = creditCardSchema
  .omit({
    id: true,
  })
  .partial()
  .superRefine((value, context) => {
    const textValues = [value.nickname, value.issuer, value.network].filter(
      (field): field is string => typeof field === "string",
    )

    for (const fieldValue of textValues) {
      if (/\b\d{12,19}\b/.test(fieldValue.replace(/\s+/g, ""))) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Do not enter full card numbers.",
        })
      }
    }
  })
const statementPaymentSchema = z.object({
  statementId: recordIdSchema,
  paidAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date."),
})

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date.")
const recurringBillSchema = z.object({
  id: recordIdSchema,
  counterparty_id: recordIdSchema,
  concept: z.string().trim().min(1).max(80),
  amount_cents: z.number().int().positive(),
  currency: z.enum(["USD", "MXN"]),
  frequency: z.enum(["monthly", "yearly"]),
  first_due_date: isoDateSchema,
  total_payments: z.number().int().positive().nullable(),
  credit_card_id: recordIdSchema.nullable(),
  category_id: recordIdSchema,
})
const recurringBillUpdateSchema = recurringBillSchema
  .omit({ id: true })
  .partial()
const recurringBillPaymentSourceSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("bank_account") }),
  z.object({ type: z.literal("credit_card"), creditCardId: recordIdSchema }),
])
const recurringBillOccurrenceSchema = z.object({
  billId: recordIdSchema,
  dueDate: isoDateSchema,
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
function validateVoucherExpense(
  transaction: {
    amount_cents: number
    is_voucher_expense: boolean
    payment_method: string
  },
  context: z.RefinementCtx,
) {
  if (
    (transaction.is_voucher_expense ||
      transaction.payment_method === "voucher") &&
    transaction.amount_cents > 0
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Voucher payments can only be used for expenses.",
      path: ["is_voucher_expense"],
    })
  }

  if (
    transaction.payment_method === "credit_card" &&
    transaction.amount_cents > 0
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Credit card purchases can only be used for expenses.",
      path: ["payment_method"],
    })
  }
}

const transactionBaseSchema = z.object({
  id: recordIdSchema,
  user_id: z.string().min(1),
  account_id: recordIdSchema,
  counterparty_id: recordIdSchema,
  category_id: recordIdSchema,
  concept: z.string().trim().min(1).max(80),
  amount_cents: z
    .number()
    .int()
    .refine((value) => value !== 0, {
      message: "Enter a transaction amount greater than $0.",
    }),
  is_voucher_expense: z.boolean().default(false),
  payment_method: z
    .enum(["bank_account", "credit_card", "voucher", "credit_card_payment"])
    .default("bank_account"),
  credit_card_id: recordIdSchema.nullable().default(null),
  credit_card_statement_id: recordIdSchema.nullable().default(null),
  posted_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z
    .string()
    .trim()
    .max(240)
    .transform((value) => (value ? value : null))
    .nullable(),
})
const transactionSchema = transactionBaseSchema.superRefine(
  validateVoucherExpense,
)

const transactionUpdateSchema = transactionBaseSchema
  .omit({
    id: true,
    user_id: true,
  })
  .superRefine(validateVoucherExpense)
const optionalBudgetIdSchema = recordIdSchema.nullable()

type TransactionMutationData = {
  transaction: TransactionRecord
  accounts: AccountRecord[]
  accountSummaries: AccountSummaryRecord[]
  creditCardStatements: CreditCardStatementRecord[]
  budgetAssignment: BudgetTransactionAssignmentRecord | null
}

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
  categories_user_name_unique: "A category with this name already exists.",
  categories_user_slug_unique: "A category with this name already exists.",
  counterparties_user_display_name_unique:
    "A contact with this name already exists.",
  credit_cards_user_nickname_unique:
    "A credit card with this nickname already exists.",
}

function slugify(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return slug || crypto.randomUUID()
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

export async function createCategoryAction(
  category: Pick<NewCategoryRecord, "id" | "name" | "theme_color">,
): Promise<FinanceActionResult<CategoryRecord>> {
  try {
    const userId = await getUserId()
    const parsedCategory = categorySchema.parse(category)
    const data = await insertCategory(userId, {
      ...parsedCategory,
      slug: slugify(parsedCategory.name),
    })

    return {
      ok: true,
      message: "Category created.",
      data,
    }
  } catch (error) {
    return handleFinanceActionError(error)
  }
}

export async function updateCategoryAction(
  id: string,
  updates: Partial<Pick<CategoryRecord, "name" | "theme_color">>,
): Promise<FinanceActionResult<CategoryRecord>> {
  try {
    const userId = await getUserId()
    const parsedId = idSchema.parse(id)
    const parsedUpdates = categoryUpdateSchema.parse(updates)
    const data = await updateCategory(userId, parsedId, {
      ...parsedUpdates,
      slug: parsedUpdates.name ? slugify(parsedUpdates.name) : undefined,
    })

    return {
      ok: true,
      message: "Category updated.",
      data,
    }
  } catch (error) {
    return handleFinanceActionError(error)
  }
}

export async function deleteCategoryAction(
  id: string,
): Promise<FinanceActionResult> {
  try {
    const userId = await getUserId()
    const parsedId = idSchema.parse(id)
    await deleteCategory(userId, parsedId)

    return {
      ok: true,
      message: "Category deleted.",
      data: undefined,
    }
  } catch (error) {
    return handleFinanceActionError(error)
  }
}

export async function createCounterpartyAction(
  counterparty: Omit<NewCounterpartyRecord, "avatar_url">,
): Promise<FinanceActionResult<CounterpartyRecord>> {
  try {
    const userId = await getUserId()
    const parsedCounterparty = counterpartySchema.parse(counterparty)
    const data = await insertCounterparty(userId, {
      ...parsedCounterparty,
      avatar_url: null,
    })

    return {
      ok: true,
      message: "Contact created.",
      data,
    }
  } catch (error) {
    return handleFinanceActionError(error)
  }
}

export async function updateCounterpartyAction(
  id: string,
  updates: Partial<Omit<CounterpartyRecord, "id" | "user_id" | "avatar_url">>,
): Promise<FinanceActionResult<CounterpartyRecord>> {
  try {
    const userId = await getUserId()
    const parsedId = idSchema.parse(id)
    const parsedUpdates = counterpartyUpdateSchema.parse(updates)
    const data = await updateCounterparty(userId, parsedId, parsedUpdates)

    return {
      ok: true,
      message: "Contact updated.",
      data,
    }
  } catch (error) {
    return handleFinanceActionError(error)
  }
}

export async function deleteCounterpartyAction(
  id: string,
): Promise<FinanceActionResult> {
  try {
    const userId = await getUserId()
    const parsedId = idSchema.parse(id)
    await deleteCounterparty(userId, parsedId)

    return {
      ok: true,
      message: "Contact deleted.",
      data: undefined,
    }
  } catch (error) {
    return handleFinanceActionError(error)
  }
}

export async function createCreditCardAction(
  creditCard: NewCreditCardRecord,
): Promise<FinanceActionResult<CreditCardRecord>> {
  try {
    const userId = await getUserId()
    const parsedCreditCard = creditCardSchema.parse({
      ...creditCard,
      archived_at: null,
    })
    const data = await insertCreditCard(userId, {
      ...parsedCreditCard,
      archived_at: null,
    })

    return {
      ok: true,
      message: "Credit card created.",
      data,
    }
  } catch (error) {
    return handleFinanceActionError(error)
  }
}

export async function updateCreditCardAction(
  id: string,
  updates: Partial<Omit<CreditCardRecord, "id" | "user_id">>,
): Promise<FinanceActionResult<CreditCardRecord>> {
  try {
    const userId = await getUserId()
    const parsedId = idSchema.parse(id)
    const parsedUpdates = creditCardUpdateSchema.parse(updates)
    const data = await updateCreditCard(userId, parsedId, parsedUpdates)

    return {
      ok: true,
      message: "Credit card updated.",
      data,
    }
  } catch (error) {
    return handleFinanceActionError(error)
  }
}

export async function archiveCreditCardAction(
  id: string,
): Promise<FinanceActionResult<CreditCardRecord>> {
  try {
    const userId = await getUserId()
    const parsedId = idSchema.parse(id)
    const data = await updateCreditCard(userId, parsedId, {
      archived_at: new Date().toISOString(),
    })

    return {
      ok: true,
      message: "Credit card archived.",
      data,
    }
  } catch (error) {
    return handleFinanceActionError(error)
  }
}

export async function payCreditCardStatementAction(
  statementId: string,
  paidAt: string,
): Promise<
  FinanceActionResult<{
    payment: CreditCardPaymentRecord
    transaction: TransactionRecord
    counterparty: CounterpartyRecord
    accounts: AccountRecord[]
    accountSummaries: AccountSummaryRecord[]
    statement: CreditCardStatementRecord
    billTransactions: TransactionRecord[]
    recurringBillPayments: RecurringBillPaymentRecord[]
  }>
> {
  try {
    const userId = await getUserId()
    const parsed = statementPaymentSchema.parse({ statementId, paidAt })
    const data = await payCreditCardStatement(
      userId,
      parsed.statementId,
      parsed.paidAt,
    )

    return {
      ok: true,
      message: "Credit card statement paid.",
      data,
    }
  } catch (error) {
    return handleFinanceActionError(error)
  }
}

export async function payCreditCardCycleAction(
  creditCardId: string,
  referenceDate: string,
  paidAt: string,
): Promise<
  FinanceActionResult<{
    payment: CreditCardPaymentRecord
    transaction: TransactionRecord
    counterparty: CounterpartyRecord
    accounts: AccountRecord[]
    accountSummaries: AccountSummaryRecord[]
    statement: CreditCardStatementRecord
    billTransactions: TransactionRecord[]
    recurringBillPayments: RecurringBillPaymentRecord[]
  }>
> {
  try {
    const userId = await getUserId()
    const parsedCreditCardId = idSchema.parse(creditCardId)
    const parsedReferenceDate = isoDateSchema.parse(referenceDate)
    const parsedPaidAt = isoDateSchema.parse(paidAt)
    const data = await payCreditCardCycle(
      userId,
      parsedCreditCardId,
      parsedReferenceDate,
      parsedPaidAt,
    )

    return {
      ok: true,
      message: "Credit card statement paid.",
      data,
    }
  } catch (error) {
    return handleFinanceActionError(error)
  }
}

export async function closeCreditCardStatementAction(
  statementId: string,
): Promise<FinanceActionResult<CreditCardStatementRecord>> {
  try {
    const userId = await getUserId()
    const parsedStatementId = idSchema.parse(statementId)
    const data = await closeZeroBalanceCreditCardStatement(
      userId,
      parsedStatementId,
    )

    return {
      ok: true,
      message: "Statement closed.",
      data,
    }
  } catch (error) {
    return handleFinanceActionError(error)
  }
}

export async function createRecurringBillAction(
  bill: Omit<NewRecurringBillRecord, "archived_at">,
): Promise<FinanceActionResult<RecurringBillRecord>> {
  try {
    const userId = await getUserId()
    const parsedBill = recurringBillSchema.parse(bill)
    const data = await insertRecurringBill(userId, {
      ...parsedBill,
      archived_at: null,
    })

    return {
      ok: true,
      message: "Recurring bill created.",
      data,
    }
  } catch (error) {
    return handleFinanceActionError(error)
  }
}

export async function updateRecurringBillAction(
  id: string,
  updates: Partial<Omit<RecurringBillRecord, "id" | "user_id" | "archived_at">>,
): Promise<FinanceActionResult<RecurringBillRecord>> {
  try {
    const userId = await getUserId()
    const parsedId = idSchema.parse(id)
    const parsedUpdates = recurringBillUpdateSchema.parse(updates)
    const data = await updateRecurringBill(userId, parsedId, parsedUpdates)

    return {
      ok: true,
      message: "Recurring bill updated.",
      data,
    }
  } catch (error) {
    return handleFinanceActionError(error)
  }
}

export async function archiveRecurringBillAction(
  id: string,
): Promise<FinanceActionResult<RecurringBillRecord>> {
  try {
    const userId = await getUserId()
    const parsedId = idSchema.parse(id)
    const data = await archiveRecurringBill(userId, parsedId)

    return {
      ok: true,
      message: "Recurring bill archived.",
      data,
    }
  } catch (error) {
    return handleFinanceActionError(error)
  }
}

export async function deleteRecurringBillAction(
  id: string,
): Promise<FinanceActionResult<{ id: string }>> {
  try {
    const userId = await getUserId()
    const parsedId = idSchema.parse(id)
    const data = await deleteRecurringBill(userId, parsedId)

    return {
      ok: true,
      message: "Recurring bill deleted.",
      data,
    }
  } catch (error) {
    return handleFinanceActionError(error)
  }
}

export async function payRecurringBillOccurrenceAction(
  billId: string,
  dueDate: string,
  source: RecurringBillPaymentSource,
  paidAt: string,
): Promise<
  FinanceActionResult<{
    billPayment: RecurringBillPaymentRecord
    transaction: TransactionRecord
    accounts: AccountRecord[]
    accountSummaries: AccountSummaryRecord[]
    creditCardStatements: CreditCardStatementRecord[]
  }>
> {
  try {
    const userId = await getUserId()
    const parsedOccurrence = recurringBillOccurrenceSchema.parse({
      billId,
      dueDate,
    })
    const parsedSource = recurringBillPaymentSourceSchema.parse(source)
    const parsedPaidAt = isoDateSchema.parse(paidAt)
    const data = await payRecurringBillOccurrence(
      userId,
      parsedOccurrence.billId,
      parsedOccurrence.dueDate,
      parsedSource,
      parsedPaidAt,
    )

    return {
      ok: true,
      message: "Bill paid.",
      data,
    }
  } catch (error) {
    return handleFinanceActionError(error)
  }
}

export async function skipRecurringBillOccurrenceAction(
  billId: string,
  dueDate: string,
): Promise<FinanceActionResult<RecurringBillPaymentRecord>> {
  try {
    const userId = await getUserId()
    const parsedOccurrence = recurringBillOccurrenceSchema.parse({
      billId,
      dueDate,
    })
    const data = await skipRecurringBillOccurrence(
      userId,
      parsedOccurrence.billId,
      parsedOccurrence.dueDate,
    )

    return {
      ok: true,
      message: "Bill occurrence skipped.",
      data,
    }
  } catch (error) {
    return handleFinanceActionError(error)
  }
}

export async function createTransactionAction(
  transaction: NewTransactionRecord,
  budgetId: string | null,
): Promise<FinanceActionResult<TransactionMutationData>> {
  try {
    const userId = await getUserId()
    const parsedTransaction = transactionSchema.parse({
      ...transaction,
      user_id: userId,
    })
    const parsedBudgetId = optionalBudgetIdSchema.parse(budgetId)
    const data = await insertTransaction(
      userId,
      parsedTransaction,
      parsedBudgetId,
    )

    return {
      ok: true,
      message: "Transaction recorded.",
      data,
    }
  } catch (error) {
    return handleFinanceActionError(error)
  }
}

export async function updateTransactionAction(
  id: string,
  updates: Omit<NewTransactionRecord, "id">,
  budgetId: string | null,
): Promise<FinanceActionResult<TransactionMutationData>> {
  try {
    const userId = await getUserId()
    const parsedId = idSchema.parse(id)
    const parsedUpdates = transactionUpdateSchema.parse(updates)
    const parsedBudgetId = optionalBudgetIdSchema.parse(budgetId)
    const data = await updateTransaction(
      userId,
      parsedId,
      parsedUpdates,
      parsedBudgetId,
    )

    return {
      ok: true,
      message: "Transaction updated.",
      data,
    }
  } catch (error) {
    return handleFinanceActionError(error)
  }
}

export async function deleteTransactionAction(id: string): Promise<
  FinanceActionResult<{
    id: string
    accounts: AccountRecord[]
    accountSummaries: AccountSummaryRecord[]
    creditCardStatements: CreditCardStatementRecord[]
  }>
> {
  try {
    const userId = await getUserId()
    const parsedId = idSchema.parse(id)
    const data = await deleteTransaction(userId, parsedId)

    return {
      ok: true,
      message: "Transaction deleted.",
      data,
    }
  } catch (error) {
    return handleFinanceActionError(error)
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
