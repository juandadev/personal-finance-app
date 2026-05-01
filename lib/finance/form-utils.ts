import type { ThemeColor } from "@/lib/theme-colors"

export const themeOptions = [
  { label: "Green", value: "chart-1" },
  { label: "Yellow", value: "chart-4" },
  { label: "Cyan", value: "chart-2" },
  { label: "Navy", value: "chart-3" },
  { label: "Red", value: "destructive" },
  { label: "Purple", value: "finance-purple" },
  { label: "Turquoise", value: "finance-turquoise" },
  { label: "Brown", value: "finance-brown" },
  { label: "Magenta", value: "finance-magenta" },
  { label: "Blue", value: "finance-blue" },
  { label: "Grey", value: "finance-grey" },
  { label: "Army", value: "finance-army" },
  { label: "Pink", value: "finance-pink" },
  { label: "Yellow", value: "finance-yellow" },
  { label: "Orange", value: "finance-orange" },
] as const satisfies readonly { label: string; value: ThemeColor }[]

export function getCurrentPeriod() {
  return new Date().toISOString().slice(0, 7)
}

export function parseDollarAmount(value: string) {
  const normalizedValue = value.trim().replaceAll(",", "")
  const amount = Number(normalizedValue)

  if (!Number.isFinite(amount) || amount <= 0) {
    return null
  }

  return Math.round(amount * 100)
}

export function formatDollarInput(amount: number) {
  return amount.toFixed(2)
}
