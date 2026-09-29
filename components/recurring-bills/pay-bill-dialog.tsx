"use client"

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
import { DatePicker } from "@/components/ui/date-picker"
import { FormStatusMessage } from "@/components/ui/form"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useFinance } from "@/hooks/use-finance"
import { getForecastLocalDate } from "@/lib/finance/forecast-period"
import { MoneyAmount } from "@/components/money-amount"
import { formatDisplayDate } from "@/lib/format"
import type { RecurringBill, RecurringBillOccurrence } from "@/lib/types"

const bankAccountValue = "bank_account"

interface PayBillDialogProps {
  bill: RecurringBill
  occurrence: RecurringBillOccurrence
  trigger?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function PayBillDialog({
  bill,
  occurrence,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: PayBillDialogProps) {
  const { actions, state } = useFinance()
  const localToday = getForecastLocalDate(
    new Date(),
    state.preferences.timezone,
  )
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = controlledOnOpenChange ?? setInternalOpen
  const [sourceValue, setSourceValue] = useState(bankAccountValue)
  const [paidAt, setPaidAt] = useState(localToday)
  const [statusMessage, setStatusMessage] = useState("")
  const [isPaying, setIsPaying] = useState(false)
  const activeCards = state.creditCards.filter((card) => !card.archived_at)
  const pot = bill.potId
    ? state.pots.find((candidate) => candidate.id === bill.potId)
    : undefined
  const isPlannedSave = Boolean(pot)
  const potBalance = pot ? pot.balance_cents / 100 : 0
  const potBalanceAfter = potBalance + occurrence.amount
  const potTarget = pot ? pot.target_cents / 100 : 0

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)

    if (nextOpen) {
      setSourceValue(bankAccountValue)
      setPaidAt(localToday)
      setStatusMessage("")
    }
  }

  const handlePay = async () => {
    setIsPaying(true)
    setStatusMessage("")

    const source =
      isPlannedSave || sourceValue === bankAccountValue
        ? ({ type: "bank_account" } as const)
        : ({ type: "credit_card", creditCardId: sourceValue } as const)
    const result = await actions.payRecurringBillOccurrence(
      bill.id,
      occurrence.dueDate,
      source,
      paidAt,
    )

    setIsPaying(false)

    if (!result.ok) {
      setStatusMessage(result.message)
      return
    }

    setOpen(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      {trigger ? (
        <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      ) : controlledOpen === undefined ? (
        <AlertDialogTrigger asChild>
          <Button size="sm">{isPlannedSave ? "Save" : "Pay Bill"}</Button>
        </AlertDialogTrigger>
      ) : null}
      <AlertDialogContent variant="finance">
        <AlertDialogHeader className="text-left">
          <AlertDialogCloseButton
            aria-label={
              isPlannedSave ? "Close save dialog" : "Close pay bill dialog"
            }
          />
          <AlertDialogTitle variant="finance">
            {pot ? `Save to ${pot.name}?` : "Pay Bill?"}
          </AlertDialogTitle>
          <AlertDialogDescription variant="finance">
            {isPlannedSave ? (
              <>
                Saving moves this amount from your bank account into the pot
                now.
              </>
            ) : (
              <>
                Paying from the bank account reduces your current balance now.
                Charging a credit card adds it to that card&apos;s open
                statement.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="mt-5 space-y-5">
          <dl className="bg-background grid gap-3 rounded-lg p-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">
                {isPlannedSave ? "Planned Save" : "Bill"}
              </dt>
              <dd className="text-right font-bold">
                {isPlannedSave ? bill.concept : bill.name}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Due Date</dt>
              <dd className="text-right">
                {formatDisplayDate(occurrence.dueDate)}
              </dd>
            </div>
            {bill.totalPayments ? (
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Progress</dt>
                <dd className="text-right">
                  Payment {occurrence.sequence} of {bill.totalPayments}
                </dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Amount</dt>
              <dd className="text-right font-bold">
                <MoneyAmount amount={occurrence.amount} forceDecimals />
              </dd>
            </div>
            {isPlannedSave ? (
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Pot Balance</dt>
                <dd className="text-right">
                  <MoneyAmount amount={potBalance} forceDecimals />{" "}
                  <span aria-hidden>→</span>
                  <span className="sr-only">to</span>{" "}
                  <span className="font-bold">
                    <MoneyAmount amount={potBalanceAfter} forceDecimals />
                  </span>
                </dd>
              </div>
            ) : null}
          </dl>
          {isPlannedSave && potBalanceAfter > potTarget ? (
            <p className="text-muted-foreground text-sm">
              This exceeds your <MoneyAmount amount={potTarget} forceDecimals />{" "}
              target.
            </p>
          ) : null}
          {isPlannedSave ? null : (
            <div className="space-y-2">
              <Label htmlFor="pay-bill-source">Payment Source</Label>
              <Select value={sourceValue} onValueChange={setSourceValue}>
                <SelectTrigger id="pay-bill-source" variant="form">
                  <SelectValue placeholder="Select a payment source" />
                </SelectTrigger>
                <SelectContent matchTriggerWidth>
                  <SelectItem value={bankAccountValue} variant="form">
                    Bank Account
                  </SelectItem>
                  {activeCards.map((card) => (
                    <SelectItem key={card.id} value={card.id} variant="form">
                      {card.nickname} •••• {card.last_four}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="pay-bill-paid-at">Payment Date</Label>
            <DatePicker
              id="pay-bill-paid-at"
              max={localToday}
              value={paidAt}
              onChange={(nextDate) => {
                if (nextDate) {
                  setPaidAt(nextDate)
                }
              }}
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
              {isPlannedSave
                ? isPaying
                  ? "Saving..."
                  : "Save to Pot"
                : isPaying
                  ? "Paying..."
                  : "Pay Bill"}
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
