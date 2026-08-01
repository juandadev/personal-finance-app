import { NextResponse } from "next/server"

import { closeMonthlyBudgets } from "@/lib/finance/monthly-close"

export const runtime = "nodejs"

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    return false
  }

  return request.headers.get("authorization") === `Bearer ${cronSecret}`
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { ok: false, message: "Unauthorized." },
      { status: 401 },
    )
  }

  try {
    const result = await closeMonthlyBudgets()

    return NextResponse.json({ ok: true, result })
  } catch (error) {
    console.error("Monthly budget close failed:", error)

    return NextResponse.json(
      { ok: false, message: "Monthly budget close failed." },
      { status: 500 },
    )
  }
}
