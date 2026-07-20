import { selectPrimaryPaymentAccount } from "@/lib/finance/accounts"
import {
  buildCreditCardObligations,
  type CreditCardObligation,
} from "@/lib/finance/credit-card-obligations"
import {
  formatForecastPeriodLabel,
  getForecastCurrentPeriod,
  getForecastLocalDate,
  getForecastPeriods,
  getPeriodEndDate,
} from "@/lib/finance/forecast-period"
import { getCurrentPeriod } from "@/lib/finance/period"
import { resolveRecurringBillOccurrences } from "@/lib/finance/recurring-bill-schedule"
import type {
  BudgetRecord,
  CashForecastAdjustmentRecord,
  CurrencyCode,
  FinanceState,
  RecurringBillPaymentRecord,
  RecurringBillRecord,
  TransactionRecord,
} from "@/lib/finance/types"

export type CashForecastBlockingReason =
  "missing-settings" | "missing-primary-account" | "mixed-currency"

export type CashForecastActivitySource =
  | "cash_transaction"
  | "default_income"
  | "additional_income"
  | "recurring_bill"
  | "credit_card_statement"
  | "planned_outflow"
  | "budget_projection"

export type CashForecastActivityStatus = "actual" | "pending"

export type CashForecastActivityChildSource =
  "credit_card_charge" | "recurring_bill" | "statement_remainder"

export interface CashForecastActivityChild {
  key: string
  sourceType: CashForecastActivityChildSource
  sourceId?: string
  label: string
  amountCents: number
  effectiveDate?: string
}

export interface CashForecastActivity {
  key: string
  sourceType: CashForecastActivitySource
  sourceId?: string
  label: string
  period: string
  amountCents: number
  effectiveDate?: string
  status: CashForecastActivityStatus
  children?: CashForecastActivityChild[]
}

export interface CashForecastBridge {
  period: string
  asOfDate: string
  startingBalanceCents: number
  actualIncomeCents: number
  actualOutflowCents: number
  actualNetMovementCents: number
  directBillObligationsCents: number
  creditCardObligationsCents: number
  remainingObligationsCents: number
  pendingAdditionalIncomeCents: number
  pendingPlannedOutflowCents: number
  pendingOutflowsCents: number
  openingBalanceCents: number
  activities: CashForecastActivity[]
}

export interface CashForecastMonth {
  period: string
  label: string
  isCurrentPeriod: boolean
  openingBalanceCents: number
  actualIncomeCents: number
  actualOutflowCents: number
  defaultIncomeCents: number
  additionalIncomeCents: number
  directBillOutflowCents: number
  creditCardOutflowCents: number
  plannedOutflowCents: number
  budgetProjectionOutflowCents: number
  totalIncomeCents: number
  totalOutflowsCents: number
  monthlyChangeCents: number
  endingBalanceCents: number
  activities: CashForecastActivity[]
}

interface BudgetProjectionParticipant {
  budget: BudgetRecord
  categoryId: string
  label: string
  oopCents: number
}

export type CashForecastResult =
  | {
      status: "blocked"
      reason: CashForecastBlockingReason
      currency?: CurrencyCode
    }
  | {
      status: "ready"
      currency: CurrencyCode
      primaryAccountId: string
      bridge: CashForecastBridge
      months: CashForecastMonth[]
    }

interface DirectBillProjection {
  bill: RecurringBillRecord
  dueDate: string
  amountCents: number
}

function groupBillPayments(payments: RecurringBillPaymentRecord[]) {
  const grouped = new Map<string, RecurringBillPaymentRecord[]>()

  for (const payment of payments) {
    const billPayments = grouped.get(payment.recurring_bill_id) ?? []

    billPayments.push(payment)
    grouped.set(payment.recurring_bill_id, billPayments)
  }

  return grouped
}

function buildDirectBillProjections(
  state: FinanceState,
  asOfDate: string,
  throughDate: string,
  archiveCutoffTimezone: string,
): DirectBillProjection[] {
  const paymentsByBillId = groupBillPayments(state.recurringBillPayments)
  const projections: DirectBillProjection[] = []

  for (const bill of state.recurringBills) {
    if (bill.credit_card_id) {
      continue
    }

    const occurrences = resolveRecurringBillOccurrences(
      bill,
      paymentsByBillId.get(bill.id) ?? [],
      asOfDate,
      { throughDate, archiveCutoffTimezone },
    )

    for (const occurrence of occurrences) {
      if (occurrence.status === "paid" || occurrence.status === "skipped") {
        continue
      }

      projections.push({
        bill,
        dueDate: occurrence.dueDate,
        amountCents: occurrence.amountCents,
      })
    }
  }

  return projections.sort((left, right) => {
    const dateComparison = left.dueDate.localeCompare(right.dueDate)

    return dateComparison !== 0
      ? dateComparison
      : left.bill.id.localeCompare(right.bill.id)
  })
}

function directBillActivity(
  projection: DirectBillProjection,
  period = projection.dueDate.slice(0, 7),
): CashForecastActivity {
  return {
    key: `recurring-bill:${projection.bill.id}:${projection.dueDate}`,
    sourceType: "recurring_bill",
    sourceId: projection.bill.id,
    label: projection.bill.concept,
    period,
    amountCents: -projection.amountCents,
    effectiveDate: projection.dueDate,
    status: "pending",
  }
}

function cardObligationActivity(
  obligation: CreditCardObligation,
  period = obligation.paymentDueDate.slice(0, 7),
): CashForecastActivity {
  const knownChildren: CashForecastActivityChild[] = [
    ...obligation.statementChargeLines.map((line) => ({
      key: `${obligation.key}:${line.key}`,
      sourceType: "credit_card_charge" as const,
      sourceId: line.transactionId,
      label: line.label,
      amountCents: -line.amountCents,
      effectiveDate: line.postedAt,
    })),
    ...obligation.pendingBillLines.map((line) => ({
      key: `${obligation.key}:${line.key}`,
      sourceType: "recurring_bill" as const,
      sourceId: line.billId,
      label: line.label,
      amountCents: -line.amountCents,
      effectiveDate: line.dueDate,
    })),
  ]
  const itemizedAmountCents = knownChildren.reduce(
    (sum, child) => sum + Math.abs(child.amountCents),
    0,
  )
  const remainderCents = obligation.amountCents - itemizedAmountCents
  const children =
    remainderCents === 0
      ? knownChildren
      : [
          ...knownChildren,
          {
            key: `${obligation.key}:remainder`,
            sourceType: "statement_remainder" as const,
            label: "Other Statement Balance",
            amountCents: -remainderCents,
          },
        ]

  return {
    key: `credit-card-payment:${obligation.key}`,
    sourceType: "credit_card_statement",
    sourceId: obligation.statementId ?? obligation.cardId,
    label: `${obligation.cardName} Statement`,
    period,
    amountCents: -obligation.amountCents,
    effectiveDate: obligation.paymentDueDate,
    status: "pending",
    children,
  }
}

function adjustmentApplies(
  adjustment: CashForecastAdjustmentRecord,
  period: string,
) {
  return adjustment.recurrence === "monthly"
    ? period >= adjustment.start_period
    : period === adjustment.start_period
}

function adjustmentActivity(
  adjustment: CashForecastAdjustmentRecord,
  period: string,
): CashForecastActivity {
  const isIncome = adjustment.kind === "additional_income"

  return {
    key: `forecast-adjustment:${adjustment.id}:${period}`,
    sourceType: adjustment.kind,
    sourceId: adjustment.id,
    label: adjustment.name,
    period,
    amountCents: adjustment.amount_cents * (isIncome ? 1 : -1),
    status: "pending",
  }
}

function transactionChangesCash(transaction: TransactionRecord): boolean {
  return (
    !transaction.is_voucher_expense &&
    (transaction.payment_method === "bank_account" ||
      transaction.payment_method === "credit_card_payment")
  )
}

function actualTransactionActivity(
  transaction: TransactionRecord,
  period: string,
): CashForecastActivity {
  return {
    key: `cash-transaction:${transaction.id}`,
    sourceType: "cash_transaction",
    sourceId: transaction.id,
    label: transaction.concept,
    period,
    amountCents: transaction.amount_cents,
    effectiveDate: transaction.posted_at,
    status: "actual",
  }
}

function sortDatedActivities(
  activities: CashForecastActivity[],
): CashForecastActivity[] {
  return activities.toSorted((left, right) => {
    const dateComparison = (left.effectiveDate ?? "").localeCompare(
      right.effectiveDate ?? "",
    )

    return dateComparison !== 0
      ? dateComparison
      : left.key.localeCompare(right.key)
  })
}

function sortAdjustments(
  adjustments: CashForecastAdjustmentRecord[],
): CashForecastAdjustmentRecord[] {
  return adjustments.toSorted((left, right) => {
    const createdComparison = left.created_at.localeCompare(right.created_at)

    return createdComparison !== 0
      ? createdComparison
      : left.id.localeCompare(right.id)
  })
}

function hasMixedCurrency(
  state: FinanceState,
  primaryCurrency: CurrencyCode,
  directBills: DirectBillProjection[],
  cardObligations: CreditCardObligation[],
): boolean {
  const contributingBillIds = new Set([
    ...directBills
      .filter((projection) => projection.amountCents > 0)
      .map((projection) => projection.bill.id),
    ...cardObligations.flatMap((obligation) =>
      obligation.pendingBillLines
        .filter((line) => line.amountCents > 0)
        .map((line) => line.billId),
    ),
  ])

  return (
    state.preferences.default_currency !== primaryCurrency ||
    state.recurringBills.some(
      (bill) =>
        contributingBillIds.has(bill.id) && bill.currency !== primaryCurrency,
    )
  )
}

function buildBudgetProjectionParticipants(
  state: FinanceState,
  asOf: Date,
): BudgetProjectionParticipant[] {
  const includedCategoryIds = new Set(
    state.cashForecastSettings?.included_budget_category_ids ?? [],
  )

  if (includedCategoryIds.size === 0) {
    return []
  }

  const activeBudgetPeriod = getCurrentPeriod(asOf)
  const categoriesById = new Map(
    state.categories.map((category) => [category.id, category]),
  )

  return state.budgets
    .filter(
      (budget) =>
        budget.period === activeBudgetPeriod &&
        includedCategoryIds.has(budget.category_id),
    )
    .map((budget) => ({
      budget,
      categoryId: budget.category_id,
      label: categoriesById.get(budget.category_id)?.name ?? "Budget",
      oopCents: Math.max(
        0,
        budget.limit_cents - budget.monthly_voucher_coverage_cents,
      ),
    }))
    .toSorted((left, right) => {
      const labelComparison = left.label.localeCompare(right.label)

      return labelComparison !== 0
        ? labelComparison
        : left.budget.id.localeCompare(right.budget.id)
    })
}

/** categoryId → duePeriod (YYYY-MM) → attributed assigned cents */
function buildCardAttributionByCategoryPeriod(
  state: FinanceState,
  obligations: CreditCardObligation[],
): Map<string, Map<string, number>> {
  const budgetsById = new Map(
    state.budgets.map((budget) => [budget.id, budget]),
  )
  const transactionsById = new Map(
    state.transactions.map((transaction) => [transaction.id, transaction]),
  )
  const assignmentsByTransactionId = new Map<
    string,
    FinanceState["budgetTransactionAssignments"]
  >()

  for (const assignment of state.budgetTransactionAssignments) {
    const assignments =
      assignmentsByTransactionId.get(assignment.transaction_id) ?? []
    assignments.push(assignment)
    assignmentsByTransactionId.set(assignment.transaction_id, assignments)
  }

  const attribution = new Map<string, Map<string, number>>()

  for (const obligation of obligations) {
    const duePeriod = obligation.paymentDueDate.slice(0, 7)

    for (const line of obligation.statementChargeLines) {
      const transaction = transactionsById.get(line.transactionId)

      if (!transaction || transaction.payment_method !== "credit_card") {
        continue
      }

      const assignments =
        assignmentsByTransactionId.get(line.transactionId) ?? []

      for (const assignment of assignments) {
        const budget = budgetsById.get(assignment.budget_id)

        if (!budget) {
          continue
        }

        const byPeriod = attribution.get(budget.category_id) ?? new Map()
        byPeriod.set(
          duePeriod,
          (byPeriod.get(duePeriod) ?? 0) + assignment.assigned_amount_cents,
        )
        attribution.set(budget.category_id, byPeriod)
      }
    }
  }

  return attribution
}

function buildChargeDuePeriodByTransactionId(
  obligations: CreditCardObligation[],
): Map<string, string> {
  const duePeriodByTransactionId = new Map<string, string>()

  for (const obligation of obligations) {
    const duePeriod = obligation.paymentDueDate.slice(0, 7)

    for (const line of obligation.statementChargeLines) {
      duePeriodByTransactionId.set(line.transactionId, duePeriod)
    }
  }

  return duePeriodByTransactionId
}

function isVoucherAssignmentTransaction(transaction: TransactionRecord) {
  return (
    transaction.is_voucher_expense || transaction.payment_method === "voucher"
  )
}

function computeBudgetProjectionCents(
  participant: BudgetProjectionParticipant,
  period: string,
  isCurrentPeriod: boolean,
  state: FinanceState,
  cardAttribution: Map<string, Map<string, number>>,
  chargeDuePeriodByTransactionId: Map<string, string>,
): number {
  const cardAttributedDueInPeriod =
    cardAttribution.get(participant.categoryId)?.get(period) ?? 0

  if (!isCurrentPeriod) {
    return Math.max(0, participant.oopCents - cardAttributedDueInPeriod)
  }

  const budget = participant.budget
  const transactionsById = new Map(
    state.transactions.map((transaction) => [transaction.id, transaction]),
  )
  // Cash still expected to leave the bank this month from this budget's OOP.
  // Voucher assignments never affect Forecast — they are not cash movement.
  // Later-due card charges reduce the due-month projection instead.
  let cashAssignedExcludingLaterCardCents = 0

  for (const assignment of state.budgetTransactionAssignments) {
    if (assignment.budget_id !== budget.id) {
      continue
    }

    const transaction = transactionsById.get(assignment.transaction_id)

    if (!transaction || isVoucherAssignmentTransaction(transaction)) {
      continue
    }

    if (transaction.payment_method === "credit_card") {
      const duePeriod = chargeDuePeriodByTransactionId.get(
        assignment.transaction_id,
      )

      if (duePeriod && duePeriod > period) {
        continue
      }
    }

    cashAssignedExcludingLaterCardCents += assignment.assigned_amount_cents
  }

  return Math.max(0, participant.oopCents - cashAssignedExcludingLaterCardCents)
}

function budgetProjectionActivity(
  participant: BudgetProjectionParticipant,
  period: string,
  amountCents: number,
): CashForecastActivity {
  return {
    key: `budget-projection:${participant.budget.id}:${period}`,
    sourceType: "budget_projection",
    sourceId: participant.budget.id,
    label: participant.label,
    period,
    amountCents: -amountCents,
    status: "pending",
  }
}

export function buildCashForecast(
  state: FinanceState,
  asOf: Date,
): CashForecastResult {
  if (!state.cashForecastSettings) {
    return { status: "blocked", reason: "missing-settings" }
  }

  const primaryAccount = selectPrimaryPaymentAccount(state.accounts)

  if (!primaryAccount) {
    return { status: "blocked", reason: "missing-primary-account" }
  }

  const timezone = state.preferences.timezone
  const asOfDate = getForecastLocalDate(asOf, timezone)
  const currentPeriod = getForecastCurrentPeriod(asOf, timezone)
  const currentPeriodEnd = getPeriodEndDate(currentPeriod)
  const periods = getForecastPeriods(asOf, timezone)
  const forecastEnd = getPeriodEndDate(periods.at(-1) ?? currentPeriod)
  const directBills = buildDirectBillProjections(
    state,
    asOfDate,
    forecastEnd,
    timezone,
  )
  const cardObligations = buildCreditCardObligations({
    cards: state.creditCards,
    statements: state.creditCardStatements,
    cardPayments: state.creditCardPayments,
    transactions: state.transactions,
    recurringBills: state.recurringBills,
    recurringBillPayments: state.recurringBillPayments,
    asOfDate,
    throughDate: forecastEnd,
    archiveCutoffTimezone: timezone,
  }).filter(
    (obligation) =>
      !obligation.isPaid &&
      obligation.amountCents > 0 &&
      obligation.paymentDueDate <= forecastEnd,
  )
  const budgetProjectionParticipants = buildBudgetProjectionParticipants(
    state,
    asOf,
  )
  const cardAttributionByCategoryPeriod = buildCardAttributionByCategoryPeriod(
    state,
    cardObligations,
  )
  const chargeDuePeriodByTransactionId =
    buildChargeDuePeriodByTransactionId(cardObligations)

  if (
    hasMixedCurrency(
      state,
      primaryAccount.currency,
      directBills,
      cardObligations,
    )
  ) {
    return {
      status: "blocked",
      reason: "mixed-currency",
      currency: primaryAccount.currency,
    }
  }

  const currentDirectBills = directBills.filter(
    (projection) => projection.dueDate <= currentPeriodEnd,
  )
  const currentCardObligations = cardObligations.filter(
    (obligation) => obligation.paymentDueDate <= currentPeriodEnd,
  )
  const directBillObligationsCents = currentDirectBills.reduce(
    (sum, projection) => sum + projection.amountCents,
    0,
  )
  const creditCardObligationsCents = currentCardObligations.reduce(
    (sum, obligation) => sum + obligation.amountCents,
    0,
  )
  const remainingObligationsCents =
    directBillObligationsCents + creditCardObligationsCents
  const sortedAdjustments = sortAdjustments(state.cashForecastAdjustments)
  const currentAdditionalIncome = sortedAdjustments.filter(
    (adjustment) =>
      adjustment.kind === "additional_income" &&
      adjustmentApplies(adjustment, currentPeriod),
  )
  const currentPlannedOutflows = sortedAdjustments.filter(
    (adjustment) =>
      adjustment.kind === "planned_outflow" &&
      adjustmentApplies(adjustment, currentPeriod),
  )
  const pendingAdditionalIncomeCents = currentAdditionalIncome.reduce(
    (sum, adjustment) => sum + adjustment.amount_cents,
    0,
  )
  const pendingPlannedOutflowCents = currentPlannedOutflows.reduce(
    (sum, adjustment) => sum + adjustment.amount_cents,
    0,
  )
  const pendingBudgetProjectionCents = budgetProjectionParticipants.reduce(
    (sum, participant) =>
      sum +
      computeBudgetProjectionCents(
        participant,
        currentPeriod,
        true,
        state,
        cardAttributionByCategoryPeriod,
        chargeDuePeriodByTransactionId,
      ),
    0,
  )
  const pendingOutflowsCents =
    remainingObligationsCents +
    pendingPlannedOutflowCents +
    pendingBudgetProjectionCents
  const currentActualTransactions = state.transactions
    .filter(
      (transaction) =>
        transaction.account_id === primaryAccount.id &&
        transaction.posted_at <= asOfDate &&
        transaction.posted_at.slice(0, 7) === currentPeriod &&
        transactionChangesCash(transaction),
    )
    .toSorted((left, right) => {
      const dateComparison = left.posted_at.localeCompare(right.posted_at)

      return dateComparison !== 0
        ? dateComparison
        : left.id.localeCompare(right.id)
    })
  const actualIncomeCents = currentActualTransactions.reduce(
    (sum, transaction) =>
      transaction.amount_cents > 0 ? sum + transaction.amount_cents : sum,
    0,
  )
  const actualOutflowCents = currentActualTransactions.reduce(
    (sum, transaction) =>
      transaction.amount_cents < 0
        ? sum + Math.abs(transaction.amount_cents)
        : sum,
    0,
  )
  const actualNetMovementCents = actualIncomeCents - actualOutflowCents
  const currentOpeningBalanceCents =
    primaryAccount.current_balance_cents - actualNetMovementCents
  const bridgeActivities = sortDatedActivities([
    ...currentDirectBills.map((projection) =>
      directBillActivity(projection, currentPeriod),
    ),
    ...currentCardObligations.map((obligation) =>
      cardObligationActivity(obligation, currentPeriod),
    ),
  ])
  let openingBalanceCents = currentOpeningBalanceCents
  const months = periods.map((period): CashForecastMonth => {
    const isCurrentPeriod = period === currentPeriod
    const defaultIncomeCents = isCurrentPeriod
      ? 0
      : (state.cashForecastSettings?.default_monthly_income_cents ?? 0)
    const additionalIncome = sortedAdjustments.filter(
      (adjustment) =>
        adjustment.kind === "additional_income" &&
        adjustmentApplies(adjustment, period),
    )
    const plannedOutflows = sortedAdjustments.filter(
      (adjustment) =>
        adjustment.kind === "planned_outflow" &&
        adjustmentApplies(adjustment, period),
    )
    const monthDirectBills = isCurrentPeriod
      ? currentDirectBills
      : directBills.filter(
          (projection) => projection.dueDate.slice(0, 7) === period,
        )
    const monthCardObligations = isCurrentPeriod
      ? currentCardObligations
      : cardObligations.filter(
          (obligation) => obligation.paymentDueDate.slice(0, 7) === period,
        )
    const monthActualIncomeCents = isCurrentPeriod ? actualIncomeCents : 0
    const monthActualOutflowCents = isCurrentPeriod ? actualOutflowCents : 0
    const additionalIncomeCents = additionalIncome.reduce(
      (sum, adjustment) => sum + adjustment.amount_cents,
      0,
    )
    const directBillOutflowCents = monthDirectBills.reduce(
      (sum, projection) => sum + projection.amountCents,
      0,
    )
    const creditCardOutflowCents = monthCardObligations.reduce(
      (sum, obligation) => sum + obligation.amountCents,
      0,
    )
    const plannedOutflowCents = plannedOutflows.reduce(
      (sum, adjustment) => sum + adjustment.amount_cents,
      0,
    )
    const budgetProjectionActivities = budgetProjectionParticipants.flatMap(
      (participant) => {
        const amountCents = computeBudgetProjectionCents(
          participant,
          period,
          isCurrentPeriod,
          state,
          cardAttributionByCategoryPeriod,
          chargeDuePeriodByTransactionId,
        )

        return amountCents > 0
          ? [budgetProjectionActivity(participant, period, amountCents)]
          : []
      },
    )
    const budgetProjectionOutflowCents = budgetProjectionActivities.reduce(
      (sum, activity) => sum + Math.abs(activity.amountCents),
      0,
    )
    const totalIncomeCents =
      monthActualIncomeCents + defaultIncomeCents + additionalIncomeCents
    const totalOutflowsCents =
      monthActualOutflowCents +
      directBillOutflowCents +
      creditCardOutflowCents +
      plannedOutflowCents +
      budgetProjectionOutflowCents
    const monthlyChangeCents = totalIncomeCents - totalOutflowsCents
    const endingBalanceCents = openingBalanceCents + monthlyChangeCents
    const datedOutflows = sortDatedActivities([
      ...monthDirectBills.map((projection) =>
        directBillActivity(projection, period),
      ),
      ...monthCardObligations.map((obligation) =>
        cardObligationActivity(obligation, period),
      ),
    ])
    const activities: CashForecastActivity[] = [
      ...(isCurrentPeriod
        ? currentActualTransactions.map((transaction) =>
            actualTransactionActivity(transaction, period),
          )
        : []),
      ...(defaultIncomeCents === 0
        ? []
        : [
            {
              key: `default-income:${period}`,
              sourceType: "default_income" as const,
              label: "Default Monthly Income",
              period,
              amountCents: defaultIncomeCents,
              status: "pending" as const,
            },
          ]),
      ...additionalIncome.map((adjustment) =>
        adjustmentActivity(adjustment, period),
      ),
      ...datedOutflows,
      ...plannedOutflows.map((adjustment) =>
        adjustmentActivity(adjustment, period),
      ),
      ...budgetProjectionActivities,
    ]
    const month = {
      period,
      label: formatForecastPeriodLabel(period),
      isCurrentPeriod,
      openingBalanceCents,
      actualIncomeCents: monthActualIncomeCents,
      actualOutflowCents: monthActualOutflowCents,
      defaultIncomeCents,
      additionalIncomeCents,
      directBillOutflowCents,
      creditCardOutflowCents,
      plannedOutflowCents,
      budgetProjectionOutflowCents,
      totalIncomeCents,
      totalOutflowsCents,
      monthlyChangeCents,
      endingBalanceCents,
      activities,
    }

    openingBalanceCents = endingBalanceCents

    return month
  })

  return {
    status: "ready",
    currency: primaryAccount.currency,
    primaryAccountId: primaryAccount.id,
    bridge: {
      period: currentPeriod,
      asOfDate,
      startingBalanceCents: primaryAccount.current_balance_cents,
      actualIncomeCents,
      actualOutflowCents,
      actualNetMovementCents,
      directBillObligationsCents,
      creditCardObligationsCents,
      remainingObligationsCents,
      pendingAdditionalIncomeCents,
      pendingPlannedOutflowCents,
      pendingOutflowsCents,
      openingBalanceCents: currentOpeningBalanceCents,
      activities: bridgeActivities,
    },
    months,
  }
}
