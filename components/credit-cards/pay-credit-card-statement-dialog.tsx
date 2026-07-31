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
import { getForecastLocalDate } from "@/lib/finance/forecast-period"
import { MoneyAmount } from "@/components/money-amount"
import { formatDisplayDate, formatDisplayDateRange } from "@/lib/format"
import type { CreditCard, CreditCardStatement } from "@/lib/types"

interface PayCreditCardStatementDialogProps {
  creditCard: CreditCard
  statement?: CreditCardStatement
  trigger?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  hideTrigger?: boolean
}

export function PayCreditCardStatementDialog({
  creditCard,
  statement,
  trigger,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}: PayCreditCardStatementDialogProps) {
  const { actions, state } = useFinance()
  const localToday = getForecastLocalDate(
    new Date(),
    state.preferences.timezone,
  )
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const [paidAt, setPaidAt] = useState(localToday)
  const [statusMessage, setStatusMessage] = useState("")
  const [isPaying, setIsPaying] = useState(false)
  const selectedStatement = statement ?? creditCard.oldestPayableStatement
  const isCardLevelPayment = statement === undefined
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen
  const canPay =
    selectedStatement &&
    selectedStatement.lifecycleStatus !== "paid" &&
    selectedStatement.totalAmount > 0

  const handleOpenChange = (nextOpen: boolean) => {
    if (!isControlled) {
      setUncontrolledOpen(nextOpen)
    }

    onOpenChange?.(nextOpen)

    if (nextOpen) {
      setPaidAt(localToday)
      setStatusMessage("")
    }
  }

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

    handleOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      {!hideTrigger ? (
        <AlertDialogTrigger asChild>
          {trigger ?? <Button size="sm">Pay Statement</Button>}
        </AlertDialogTrigger>
      ) : null}
      <AlertDialogContent variant="finance">
        <AlertDialogHeader className="text-left">
          <AlertDialogCloseButton aria-label="Close pay statement dialog" />
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
                    <MoneyAmount
                      amount={selectedStatement.amount}
                      forceDecimals
                    />
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">
                    Pending charges ({selectedStatement.pendingBills.length})
                  </dt>
                  <dd className="text-right">
                    <MoneyAmount
                      amount={selectedStatement.pendingBillsAmount}
                      forceDecimals
                    />
                  </dd>
                </div>
              </>
            ) : null}
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Amount</dt>
              <dd className="text-right font-bold">
                <MoneyAmount
                  amount={selectedStatement.totalAmount}
                  forceDecimals
                />
              </dd>
            </div>
          </dl>
          {selectedStatement.pendingBillsAmount > 0 ? (
            <p className="text-muted-foreground text-xs leading-normal">
              Paying this statement also records due recurring bills and
              annuality charges as card transactions.
            </p>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="credit-card-paid-at">Payment Date</Label>
            <Input
              id="credit-card-paid-at"
              type="date"
              max={localToday}
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
