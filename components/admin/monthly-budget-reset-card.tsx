"use client"

import { useState } from "react"
import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react"

import { resetBudgetsAction } from "@/app/(app)/admin/actions"
import type { ResetBudgetsActionResult } from "@/app/(app)/admin/actions"
import { AuthStatusMessage } from "@/components/auth/auth-page-shell"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogCloseButton,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardTitle } from "@/components/ui/card"

export function MonthlyBudgetResetCard() {
  const [isResetting, setIsResetting] = useState(false)
  const [result, setResult] = useState<ResetBudgetsActionResult | null>(null)

  const handleResetBudgets = async () => {
    setIsResetting(true)
    setResult(null)

    const nextResult = await resetBudgetsAction()

    setResult(nextResult)
    setIsResetting(false)
  }

  return (
    <Card asChild className="max-w-3xl" padding="overview">
      <section aria-labelledby="monthly-budget-reset-title">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="bg-background text-destructive flex size-10 items-center justify-center rounded-full">
                <ArrowCounterClockwiseIcon
                  weight="fill"
                  className="size-5"
                  aria-hidden
                />
              </span>
              <CardTitle id="monthly-budget-reset-title">
                Monthly Budget Reset
              </CardTitle>
            </div>
            <CardDescription className="max-w-2xl leading-6">
              Manually run the same monthly budget close/reset process that
              production cron will handle. This closes the previous period,
              creates snapshots, and copies budgets into the next period.
            </CardDescription>
          </div>

          <AlertDialog
            onOpenChange={(open) => {
              if (open) {
                setResult(null)
              }
            }}
          >
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="destructive"
                size="card-action"
                className="md:shrink-0"
              >
                Reset Budgets
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent variant="finance">
              <AlertDialogHeader className="text-left">
                <AlertDialogTitle variant="finance">
                  Reset Budgets?
                </AlertDialogTitle>
                <AlertDialogDescription variant="finance">
                  This will close the previous budget period, create monthly
                  budget snapshots, and copy those budgets into the next period.
                  Run this only when you intend to fire the monthly reset
                  manually.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <AlertDialogCloseButton aria-label="Close reset budgets dialog" />

              <div className="mt-5 flex flex-col gap-5">
                <AlertDialogAction
                  variant="destructive"
                  size="finance-submit"
                  disabled={isResetting}
                  onClick={(event) => {
                    event.preventDefault()
                    void handleResetBudgets()
                  }}
                >
                  {isResetting ? "Resetting..." : "Reset Budgets Now"}
                </AlertDialogAction>
                {result ? (
                  <AuthStatusMessage variant={result.ok ? "success" : "error"}>
                    {result.message}
                  </AuthStatusMessage>
                ) : null}
                {result?.ok ? (
                  <dl className="grid grid-cols-2 gap-3 rounded-lg border p-4 text-sm md:grid-cols-3">
                    <div>
                      <dt className="text-muted-foreground">Snapshots</dt>
                      <dd className="font-bold tabular-nums">
                        {result.data.snapshotsCreated}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Budgets Copied</dt>
                      <dd className="font-bold tabular-nums">
                        {result.data.budgetsCopied}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Failures</dt>
                      <dd className="font-bold tabular-nums">
                        {result.data.failures.length}
                      </dd>
                    </div>
                  </dl>
                ) : null}
                <AlertDialogCancel
                  variant="muted-link"
                  size="text-link"
                  className="mx-auto"
                  disabled={isResetting}
                >
                  Keep Budgets
                </AlertDialogCancel>
              </div>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </section>
    </Card>
  )
}
