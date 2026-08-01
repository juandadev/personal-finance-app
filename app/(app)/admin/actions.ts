"use server"

import { isAdminUser } from "@/lib/admin/access"
import { auth } from "@/lib/auth/server"
import {
  closeMonthlyBudgets,
  type MonthlyBudgetCloseResult,
} from "@/lib/finance/monthly-close"

export type ResetBudgetsActionResult =
  | {
      ok: true
      message: string
      data: MonthlyBudgetCloseResult
    }
  | {
      ok: false
      message: string
    }

function formatSuccessMessage(result: MonthlyBudgetCloseResult) {
  const failureCopy =
    result.failures.length > 0
      ? ` ${result.failures.length} user reset failed.`
      : ""

  return `Budget reset completed for ${result.period}. Checked ${result.usersChecked} users, closed ${result.usersClosed}, skipped ${result.usersSkipped}.${failureCopy}`
}

export async function resetBudgetsAction(): Promise<ResetBudgetsActionResult> {
  const { data: session } = await auth.getSession()

  if (!isAdminUser(session?.user)) {
    return {
      ok: false,
      message: "Unauthorized.",
    }
  }

  try {
    const result = await closeMonthlyBudgets()

    return {
      ok: true,
      message: formatSuccessMessage(result),
      data: result,
    }
  } catch (error) {
    console.error("Manual budget reset failed:", error)

    return {
      ok: false,
      message:
        "Monthly budget reset failed. Try again or check the server logs.",
    }
  }
}
