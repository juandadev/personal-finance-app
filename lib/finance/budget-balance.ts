export type BudgetCloseStatus = "within_budget" | "over_budget"

export function getBudgetRemaining(maximum: number, spent: number): number {
  if (maximum <= 0) {
    return 0
  }

  return maximum - spent
}

export function getBudgetOverage(maximum: number, spent: number): number {
  if (maximum <= 0) {
    return 0
  }

  return Math.max(spent - maximum, 0)
}

export function isBudgetOverLimit(maximum: number, spent: number): boolean {
  return maximum > 0 && spent > maximum
}

export function getBudgetCloseStatus(
  maximum: number,
  spent: number,
): BudgetCloseStatus {
  return isBudgetOverLimit(maximum, spent) ? "over_budget" : "within_budget"
}

export function getBudgetSnapshotFields(maximum: number, spent: number) {
  if (isBudgetOverLimit(maximum, spent)) {
    return {
      freeAmount: 0,
      overAmount: getBudgetOverage(maximum, spent),
      status: "over_budget" as const,
    }
  }

  return {
    freeAmount: getBudgetRemaining(maximum, spent),
    overAmount: 0,
    status: "within_budget" as const,
  }
}
