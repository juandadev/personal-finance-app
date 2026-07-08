"use client"

import { useState } from "react"

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
import { FormStatusMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useFinance } from "@/hooks/use-finance"
import {
  formatCurrency,
  formatDisplayDate,
  formatDisplayDateRange,
} from "@/lib/format"
import type { CreditCard, CreditCardStatement } from "@/lib/types"

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

interface PayCreditCardStatementDialogProps {
  creditCard: CreditCard
  statement?: CreditCardStatement
}

export function PayCreditCardStatementDialog({
  creditCard,
  statement = creditCard.currentStatement,
}: PayCreditCardStatementDialogProps) {
  const { actions } = useFinance()
  const [open, setOpen] = useState(false)
  const [paidAt, setPaidAt] = useState(todayIsoDate())
  const [statusMessage, setStatusMessage] = useState("")
  const [isPaying, setIsPaying] = useState(false)
  const canPay =
    statement && statement.lifecycleStatus !== "paid" && statement.amount > 0

  if (!canPay || !statement) {
    return null
  }

  const handlePay = async () => {
    setIsPaying(true)
    setStatusMessage("")

    const result = await actions.payCreditCardStatement(statement.id, paidAt)

    setIsPaying(false)

    if (!result.ok) {
      setStatusMessage(result.message)
      return
    }

    setOpen(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button size="sm">Pay Statement</Button>
      </AlertDialogTrigger>
      <AlertDialogContent variant="finance">
        <AlertDialogHeader className="text-left">
          <AlertDialogTitle variant="finance">Pay Statement?</AlertDialogTitle>
          <AlertDialogDescription variant="finance">
            This will reduce your current balance without adding a new expense
            or budget spend.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogCloseButton aria-label="Close pay statement dialog" />
        <div className="mt-5 space-y-5">
          <dl className="bg-background grid gap-3 rounded-lg p-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Card</dt>
              <dd className="text-right font-bold">{creditCard.nickname}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Statement Period</dt>
              <dd className="text-right">
                {formatDisplayDateRange(
                  statement.periodStart,
                  statement.periodEnd,
                )}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Due Date</dt>
              <dd className="text-right">
                {formatDisplayDate(statement.paymentDueDate)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Amount</dt>
              <dd className="text-right font-bold">
                {formatCurrency(statement.amount, {
                  forceDecimals: true,
                })}
              </dd>
            </div>
          </dl>
          <div className="space-y-2">
            <Label htmlFor="credit-card-paid-at">Payment Date</Label>
            <Input
              id="credit-card-paid-at"
              type="date"
              value={paidAt}
              onChange={(event) => setPaidAt(event.target.value)}
            />
          </div>
          {statusMessage ? (
            <FormStatusMessage variant="error">
              {statusMessage}
            </FormStatusMessage>
          ) : null}
          <div className="flex flex-col gap-4">
            <AlertDialogAction
              size="finance-submit"
              disabled={isPaying}
              onClick={(event) => {
                event.preventDefault()
                void handlePay()
              }}
            >
              {isPaying ? "Paying..." : "Pay Statement"}
            </AlertDialogAction>
            <AlertDialogCancel
              variant="muted-link"
              size="text-link"
              className="mx-auto"
            >
              Cancel
            </AlertDialogCancel>
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
