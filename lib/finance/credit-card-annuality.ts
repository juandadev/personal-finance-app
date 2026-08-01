import { getCreditCardStatementCycle } from "@/lib/finance/credit-card-cycle"
import type {
  CreditCardAnnualityOverrideRecord,
  CreditCardRecord,
  CreditCardStatementRecord,
  TransactionRecord,
} from "@/lib/finance/types"

export const ANNUALITY_CONCEPT = "Annuality"

export function annualityDescription(
  anniversaryYear: number,
  installmentIndex: number,
) {
  return `annuality:${anniversaryYear}:${installmentIndex}`
}

export function parseAnnualityDescription(description: string | null) {
  if (!description) {
    return null
  }

  const match = /^annuality:(\d{4}):(\d{1,2})$/.exec(description)

  if (!match) {
    return null
  }

  return {
    anniversaryYear: Number(match[1]),
    installmentIndex: Number(match[2]),
  }
}

export type AnnualityInstallmentStatus =
  "materialized" | "pending" | "reserved" | "future"

export interface CreditCardAnnualityInstallment {
  key: string
  anniversaryYear: number
  installmentIndex: number
  amountCents: number
  dueDate: string
  periodStart: string
  periodEnd: string
  paymentDueDate: string
  status: AnnualityInstallmentStatus
  isMaterialized: boolean
  isOverridden: boolean
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

function clampDay(year: number, month: number, day: number) {
  return Math.min(day, daysInMonth(year, month))
}

function toIsoDate(year: number, month: number, day: number) {
  return [
    year.toString().padStart(4, "0"),
    month.toString().padStart(2, "0"),
    day.toString().padStart(2, "0"),
  ].join("-")
}

function parseIsoDate(isoDate: string) {
  const [year = 0, month = 0, day = 0] = isoDate.split("-").map(Number)

  return { year, month, day }
}

export function resolveAnniversaryDate(
  year: number,
  month: number,
  day: number,
) {
  return toIsoDate(year, month, clampDay(year, month, day))
}

export function splitAnnualityAmounts(
  totalCents: number,
  paymentCount: number,
): number[] {
  if (paymentCount < 1) {
    return []
  }

  const base = Math.floor(totalCents / paymentCount)
  const amounts = Array.from({ length: paymentCount }, () => base)
  const remainder = totalCents - base * paymentCount

  amounts[paymentCount - 1] += remainder

  return amounts
}

function nextCycleStart(periodEnd: string) {
  const { year, month, day } = parseIsoDate(periodEnd)
  const next = new Date(year, month - 1, day + 1)

  return toIsoDate(next.getFullYear(), next.getMonth() + 1, next.getDate())
}

export function getActiveAnniversaryYear(
  card: Pick<
    CreditCardRecord,
    | "annuality_anniversary_month"
    | "annuality_anniversary_day"
    | "closing_day_of_month"
    | "payment_due_day_of_month"
  >,
  asOfDate: string,
) {
  const month = card.annuality_anniversary_month!
  const day = card.annuality_anniversary_day!
  const asOfYear = parseIsoDate(asOfDate).year
  const anniversaryThisYear = resolveAnniversaryDate(asOfYear, month, day)
  const firstCycleThisYear = getCreditCardStatementCycle(
    anniversaryThisYear,
    card,
  )

  if (firstCycleThisYear.periodStart <= asOfDate) {
    return asOfYear
  }

  return asOfYear - 1
}

function materializedKeys(
  cardId: string,
  transactions: TransactionRecord[],
): Set<string> {
  const keys = new Set<string>()

  for (const transaction of transactions) {
    if (
      transaction.credit_card_id !== cardId ||
      transaction.payment_method !== "credit_card" ||
      transaction.concept !== ANNUALITY_CONCEPT
    ) {
      continue
    }

    const parsed = parseAnnualityDescription(transaction.description)

    if (!parsed) {
      continue
    }

    keys.add(`${parsed.anniversaryYear}:${parsed.installmentIndex}`)
  }

  return keys
}

function buildEqualAmountsWithMaterializedLock(
  totalCents: number,
  paymentCount: number,
  materializedAmountsByIndex: Map<number, number>,
) {
  const amounts = Array.from({ length: paymentCount }, () => 0)
  let materializedSum = 0

  for (const [index, amount] of materializedAmountsByIndex) {
    if (index < 1 || index > paymentCount) {
      continue
    }

    amounts[index - 1] = amount
    materializedSum += amount
  }

  const remainingIndexes: number[] = []

  for (let index = 1; index <= paymentCount; index += 1) {
    if (!materializedAmountsByIndex.has(index)) {
      remainingIndexes.push(index)
    }
  }

  const remainingTotal = Math.max(0, totalCents - materializedSum)
  const split = splitAnnualityAmounts(remainingTotal, remainingIndexes.length)

  remainingIndexes.forEach((index, splitIndex) => {
    amounts[index - 1] = split[splitIndex] ?? 0
  })

  return amounts
}

export function resolveCreditCardAnnualityInstallments(input: {
  card: CreditCardRecord
  overrides: CreditCardAnnualityOverrideRecord[]
  statements: Pick<
    CreditCardStatementRecord,
    "period_start" | "period_end" | "lifecycle_status"
  >[]
  transactions: TransactionRecord[]
  asOfDate: string
  throughDate?: string
  anniversaryYear?: number
}): CreditCardAnnualityInstallment[] {
  const { card, asOfDate } = input

  if (
    !card.annuality_enabled ||
    card.archived_at ||
    card.annuality_amount_cents == null ||
    card.annuality_amount_cents <= 0 ||
    card.annuality_anniversary_month == null ||
    card.annuality_anniversary_day == null ||
    card.annuality_payment_count == null ||
    card.annuality_payment_count < 1
  ) {
    return []
  }

  const paymentCount = card.annuality_payment_count
  const anniversaryYear =
    input.anniversaryYear ?? getActiveAnniversaryYear(card, asOfDate)
  const anniversaryDate = resolveAnniversaryDate(
    anniversaryYear,
    card.annuality_anniversary_month,
    card.annuality_anniversary_day,
  )
  const settled = materializedKeys(card.id, input.transactions)
  const overrideByIndex = new Map(
    input.overrides
      .filter(
        (override) =>
          override.credit_card_id === card.id &&
          override.anniversary_year === anniversaryYear &&
          override.installment_index >= 1 &&
          override.installment_index <= paymentCount,
      )
      .map((override) => [override.installment_index, override.amount_cents]),
  )

  const materializedAmounts = new Map<number, number>()

  for (let index = 1; index <= paymentCount; index += 1) {
    if (settled.has(`${anniversaryYear}:${index}`)) {
      // Prefer override/default from a matching transaction amount when present.
      const matchingTxn = input.transactions.find((transaction) => {
        if (
          transaction.credit_card_id !== card.id ||
          transaction.payment_method !== "credit_card" ||
          transaction.concept !== ANNUALITY_CONCEPT
        ) {
          return false
        }

        const parsed = parseAnnualityDescription(transaction.description)

        return (
          parsed?.anniversaryYear === anniversaryYear &&
          parsed.installmentIndex === index
        )
      })

      materializedAmounts.set(
        index,
        matchingTxn ? Math.abs(matchingTxn.amount_cents) : 0,
      )
    }
  }

  const defaultAmounts = buildEqualAmountsWithMaterializedLock(
    card.annuality_amount_cents,
    paymentCount,
    materializedAmounts,
  )

  const installments: CreditCardAnnualityInstallment[] = []
  let cycle = getCreditCardStatementCycle(anniversaryDate, card)

  for (let index = 1; index <= paymentCount; index += 1) {
    const isMaterialized = settled.has(`${anniversaryYear}:${index}`)
    const isOverridden = overrideByIndex.has(index) && !isMaterialized
    const amountCents = isMaterialized
      ? (materializedAmounts.get(index) ?? defaultAmounts[index - 1] ?? 0)
      : (overrideByIndex.get(index) ?? defaultAmounts[index - 1] ?? 0)

    let status: AnnualityInstallmentStatus

    if (isMaterialized) {
      status = "materialized"
    } else if (cycle.periodStart <= asOfDate) {
      // Due for the cycle containing/as-of today or earlier open cycles.
      status = "pending"
    } else {
      status = "reserved"
    }

    if (
      input.throughDate &&
      cycle.periodStart > input.throughDate &&
      status === "reserved"
    ) {
      status = "future"
    }

    installments.push({
      key: `${card.id}:annuality:${anniversaryYear}:${index}`,
      anniversaryYear,
      installmentIndex: index,
      amountCents,
      dueDate: anniversaryDate,
      periodStart: cycle.periodStart,
      periodEnd: cycle.periodEnd,
      paymentDueDate: cycle.paymentDueDate,
      status,
      isMaterialized,
      isOverridden,
    })

    cycle = getCreditCardStatementCycle(nextCycleStart(cycle.periodEnd), card)
  }

  return installments
}

export function getPendingAnnualityInstallmentsForPeriod(input: {
  card: CreditCardRecord
  overrides: CreditCardAnnualityOverrideRecord[]
  statements: Pick<
    CreditCardStatementRecord,
    "period_start" | "period_end" | "lifecycle_status"
  >[]
  transactions: TransactionRecord[]
  asOfDate: string
  periodStart: string
}) {
  return resolveCreditCardAnnualityInstallments(input).filter(
    (installment) =>
      !installment.isMaterialized &&
      installment.periodStart === input.periodStart &&
      installment.status === "pending",
  )
}
