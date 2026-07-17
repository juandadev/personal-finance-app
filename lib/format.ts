import { format as formatDateFns } from "date-fns"

import type { CurrencyCode } from "@/lib/finance/types"

interface CurrencyFormatOptions {
  currency?: CurrencyCode
  forceDecimals?: boolean
  locale?: string
}

/**
 * Format a number as currency.
 * - Whole numbers render without decimals (e.g. $850).
 * - Non-whole numbers render with two decimals (e.g. $194.98).
 */
export function formatCurrency(
  value: number,
  options?: CurrencyFormatOptions,
): string {
  const isWhole = Number.isInteger(value)
  const minimumFractionDigits = options?.forceDecimals ? 2 : isWhole ? 0 : 2
  const maximumFractionDigits = options?.forceDecimals ? 2 : isWhole ? 0 : 2

  return new Intl.NumberFormat(options?.locale ?? "en-US", {
    style: "currency",
    currency: options?.currency ?? "USD",
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value)
}

export function formatCompactCurrency(
  value: number,
  options?: Omit<CurrencyFormatOptions, "forceDecimals">,
): string {
  return new Intl.NumberFormat(options?.locale ?? "en-US", {
    style: "currency",
    currency: options?.currency ?? "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)
}

/**
 * Format a signed transaction amount with explicit sign and two decimals.
 * e.g. +$75.50 / -$42.30
 */
export function formatSignedAmount(
  value: number,
  options?: Omit<CurrencyFormatOptions, "forceDecimals">,
): string {
  const sign = value >= 0 ? "+" : "-"
  const absolute = Math.abs(value)
  const formatted = new Intl.NumberFormat(options?.locale ?? "en-US", {
    style: "currency",
    currency: options?.currency ?? "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absolute)
  return `${sign}${formatted}`
}

export function transactionAmountClassName(amount: number): string {
  return amount > 0 ? "text-accent" : "text-destructive"
}

export function formatBudgetPercentage(spent: number, maximum: number): string {
  if (maximum <= 0) {
    return "0%"
  }

  const percentage = (spent / maximum) * 100
  return `${percentage.toFixed(percentage < 10 ? 2 : 1)}%`
}

function parseIsoDateAsLocalDate(isoDate: string): Date {
  const [year = 0, month = 1, day = 1] = isoDate.split("-").map(Number)

  return new Date(year, month - 1, day)
}

export function formatDisplayDate(
  isoDate: string,
  dateFormat = "MMM d, yyyy",
): string {
  return formatDateFns(parseIsoDateAsLocalDate(isoDate), dateFormat)
}

export function formatDisplayDateRange(
  startIsoDate: string,
  endIsoDate: string,
) {
  return `${formatDisplayDate(startIsoDate, "dd/MM/yyyy")} - ${formatDisplayDate(endIsoDate, "dd/MM/yyyy")}`
}

export function formatBillScheduleShortDate(
  isoDate: string,
  frequency: "monthly" | "yearly" | "one_time",
): string {
  const date = parseIsoDateAsLocalDate(isoDate)

  if (frequency === "yearly" || frequency === "one_time") {
    return formatDateFns(date, "MMM do")
  }

  return formatDateFns(date, "do")
}
