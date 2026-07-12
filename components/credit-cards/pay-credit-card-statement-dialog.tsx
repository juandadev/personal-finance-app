"use client"

import Link from "next/link"
import { useState, type ReactNode } from "react"

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
  trigger?: ReactNode
}

export function PayCreditCardStatementDialog({
  creditCard,
  statement,
  trigger,
}: PayCreditCardStatementDialogProps) {
  const { actions } = useFinance()
  const [open, setOpen] = useState(false)
  const [paidAt, setPaidAt] = useState(todayIsoDate())
  const [statusMessage, setStatusMessage] = useState("")
  const [isPaying, setIsPaying] = useState(false)
  const selectedStatement = statement ?? creditCard.oldestPayableStatement
  const isCardLevelPayment = statement === undefined
  const canPay =
    selectedStatement &&
    selectedStatement.lifecycleStatus !== "paid" &&
    selectedStatement.totalAmount > 0

  if (!canPay || !selectedStatement) {
    return null
  }

  const handlePay = async () => {
    setIsPaying(true)
    setStatusMessage("")

    // Virtual statements have no row yet (pending bills only); the cycle pay
    // action creates the statement before paying it.
    const result = selectedStatement.isVirtual
      ? await actions.payCreditCardCycle(
          creditCard.id,
          selectedStatement.periodEnd,
          paidAt,
        )
      : await actions.payCreditCardStatement(selectedStatement.id, paidAt)

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
        {trigger ?? <Button size="sm">Pay Statement</Button>}
      </AlertDialogTrigger>
      <AlertDialogContent variant="finance">
        <AlertDialogHeader className="text-left">
          <AlertDialogTitle variant="finance">Pay Statement?</AlertDialogTitle>
          <AlertDialogDescription variant="finance">
            {isCardLevelPayment ? (
              <>
                You are paying the oldest payable statement:{" "}
                <span className="font-semibold">
                  {formatDisplayDateRange(
                    selectedStatement.periodStart,
                    selectedStatement.periodEnd,
                  )}
                </span>
                . Choose another statement from card details if needed.
              </>
            ) : (
              <>
                This will reduce your current balance without adding a new
                expense or budget spend.
              </>
            )}
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
                  selectedStatement.periodStart,
                  selectedStatement.periodEnd,
                )}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Due Date</dt>
              <dd className="text-right">
                {formatDisplayDate(selectedStatement.paymentDueDate)}
              </dd>
            </div>
            {selectedStatement.pendingBillsAmount > 0 ? (
              <>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Purchases</dt>
                  <dd className="text-right">
                    {formatCurrency(selectedStatement.amount, {
                      forceDecimals: true,
                    })}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">
                    Recurring Bills ({selectedStatement.pendingBills.length})
                  </dt>
                  <dd className="text-right">
                    {formatCurrency(selectedStatement.pendingBillsAmount, {
                      forceDecimals: true,
                    })}
                  </dd>
                </div>
              </>
            ) : null}
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Amount</dt>
              <dd className="text-right font-bold">
                {formatCurrency(selectedStatement.totalAmount, {
                  forceDecimals: true,
                })}
              </dd>
            </div>
          </dl>
          {selectedStatement.pendingBillsAmount > 0 ? (
            <p className="text-muted-foreground text-xs leading-normal">
              Paying this statement also records the due recurring bills as card
              transactions and marks them as paid.
            </p>
          ) : null}
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
            {isCardLevelPayment ? (
              <Button asChild variant="secondary" size="finance-submit">
                <Link href={`/credit-cards/${creditCard.id}`}>
                  View Card Details
                </Link>
              </Button>
            ) : null}
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
