"use server"

import { revalidatePath } from "next/cache"

import { isAdminUser } from "@/lib/admin/access"
import { formatMonthlyBudgetResetMessage } from "@/lib/admin/reset-message"
import { auth } from "@/lib/auth/server"
import {
  closeMonthlyBudgets,
  type MonthlyBudgetCloseResult,
} from "@/lib/finance/monthly-close"
import { logServerError } from "@/lib/observability/server-logger"

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

export async function resetBudgetsAction(): Promise<ResetBudgetsActionResult> {
  const { data: session } = await auth.getSession()

  if (!session?.user?.emailVerified || !isAdminUser(session.user)) {
    return {
      ok: false,
      message: "Unauthorized.",
    }
  }

  try {
    const result = await closeMonthlyBudgets()

    revalidatePath("/", "layout")

    return {
      ok: true,
      message: formatMonthlyBudgetResetMessage(result),
      data: result,
    }
  } catch (error) {
    logServerError("manual_monthly_close_failed", error)

    return {
      ok: false,
      message:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : "Monthly budget reset failed. Try again or check the server logs.",
    }
  }
}
