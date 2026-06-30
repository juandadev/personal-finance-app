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
