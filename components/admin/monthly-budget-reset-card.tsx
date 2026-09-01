"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react"

import {
  resetBudgetsAction,
  type ResetBudgetsActionResult,
} from "@/app/(app)/admin/actions"
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
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { FormStatusMessage } from "@/components/ui/form"
import { runFinanceAction } from "@/lib/finance/reducer"

export function MonthlyBudgetResetCard() {
  const router = useRouter()
  const [isResetting, setIsResetting] = useState(false)
  const [result, setResult] = useState<ResetBudgetsActionResult | null>(null)

  const handleResetBudgets = async () => {
    setIsResetting(true)
    setResult(null)

    const nextResult = await runFinanceAction(() => resetBudgetsAction())

    setResult(nextResult)
    setIsResetting(false)

    if (nextResult.ok) {
      router.refresh()
    }
  }

  return (
    <Card asChild className="max-w-3xl">
      <section aria-labelledby="monthly-budget-reset-title">
        <CardHeader className="items-start">
          <div className="space-y-2">
            <CardTitle id="monthly-budget-reset-title">
              <ArrowCounterClockwiseIcon
                className="text-destructive size-5"
                weight="fill"
                aria-hidden
              />
              Monthly Budget Reset
            </CardTitle>
            <CardDescription className="max-w-prose leading-6">
              Manually run the same monthly budget close that production cron
              handles. This closes the previous period, creates snapshots, and
              copies budgets into the next period.
            </CardDescription>
          </div>
        </CardHeader>

        <AlertDialog
          onOpenChange={(open) => {
            if (open) {
              setResult(null)
            }
          }}
        >
          <AlertDialogTrigger asChild>
            <Button type="button" variant="destructive" className="mt-6">
              <ArrowCounterClockwiseIcon weight="fill" aria-hidden />
              Reset Budgets
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent variant="finance">
            <AlertDialogHeader className="text-left">
              <AlertDialogCloseButton aria-label="Close reset budgets dialog" />
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
                <FormStatusMessage variant={result.ok ? "success" : "error"}>
                  {result.message}
                </FormStatusMessage>
              ) : null}
              {result?.ok ? (
                <dl className="border-border grid grid-cols-2 gap-3 rounded-lg border p-4 text-sm md:grid-cols-3">
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
                      {result.data.failureCount}
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
      </section>
    </Card>
  )
}
