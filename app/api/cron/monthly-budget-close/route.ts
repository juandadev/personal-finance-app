import { timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"

import { getCronSecret } from "@/lib/env/server"
import { closeMonthlyBudgets } from "@/lib/finance/monthly-close"
import {
  logServerError,
  logSecurityEvent,
} from "@/lib/observability/server-logger"

export const runtime = "nodejs"

function isAuthorized(request: Request) {
  let cronSecret: string

  try {
    cronSecret = getCronSecret()
  } catch {
    return false
  }

  const authorization = request.headers.get("authorization")
  const expected = `Bearer ${cronSecret}`

  if (!authorization || authorization.length !== expected.length) {
    return false
  }

  return timingSafeEqual(Buffer.from(authorization), Buffer.from(expected))
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    logSecurityEvent("monthly_close_unauthorized")

    return NextResponse.json(
      { ok: false, message: "Unauthorized." },
      {
        status: 401,
        headers: { "Cache-Control": "no-store" },
      },
    )
  }

  try {
    const result = await closeMonthlyBudgets()

    return NextResponse.json(
      {
        ok: true,
        result: {
          period: result.period,
          nextPeriod: result.nextPeriod,
          usersChecked: result.usersChecked,
          usersClosed: result.usersClosed,
          usersSkipped: result.usersSkipped,
          snapshotsCreated: result.snapshotsCreated,
          budgetsCopied: result.budgetsCopied,
          failureCount: result.failureCount,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    logServerError("monthly_close_failed", error)

    return NextResponse.json(
      { ok: false, message: "Monthly budget close failed." },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      },
    )
  }
}
