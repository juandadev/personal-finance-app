interface MonthlyBudgetResetSummary {
  failureCount: number
  period: string
  usersChecked: number
  usersClosed: number
  usersSkipped: number
}

export function formatMonthlyBudgetResetMessage(
  result: MonthlyBudgetResetSummary,
) {
  const failureCopy =
    result.failureCount > 0 ? ` ${result.failureCount} user reset failed.` : ""

  return `Budget reset completed for ${result.period}. Checked ${result.usersChecked} users, closed ${result.usersClosed}, skipped ${result.usersSkipped}.${failureCopy}`
}
