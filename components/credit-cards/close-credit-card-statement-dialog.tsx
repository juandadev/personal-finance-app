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
import { useFinance } from "@/hooks/use-finance"
import { formatCurrency, formatDisplayDateRange } from "@/lib/format"
import type { CreditCard, CreditCardStatement } from "@/lib/types"

interface CloseCreditCardStatementDialogProps {
  creditCard: CreditCard
  statement?: CreditCardStatement
}

export function CloseCreditCardStatementDialog({
  creditCard,
  statement = creditCard.currentStatement,
}: CloseCreditCardStatementDialogProps) {
  const { actions } = useFinance()
  const [open, setOpen] = useState(false)
  const [statusMessage, setStatusMessage] = useState("")
  const [isClosing, setIsClosing] = useState(false)
  const canClose =
    statement &&
    statement.lifecycleStatus !== "paid" &&
    statement.totalAmount === 0

  if (!canClose || !statement) {
    return null
  }

  const handleCloseStatement = async () => {
    setIsClosing(true)
    setStatusMessage("")

    const result = await actions.closeCreditCardStatement(statement.id)

    setIsClosing(false)

    if (!result.ok) {
      setStatusMessage(result.message)
      return
    }

    setOpen(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="secondary">
          Close Statement
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent variant="finance">
        <AlertDialogHeader className="text-left">
          <AlertDialogTitle variant="finance">
            Close Statement?
          </AlertDialogTitle>
          <AlertDialogDescription variant="finance">
            This locks the zero-balance statement without recording a payment or
            changing your bank balance.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogCloseButton aria-label="Close statement dialog" />
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
              <dt className="text-muted-foreground">Amount</dt>
              <dd className="text-right font-bold">
                {formatCurrency(statement.amount, { forceDecimals: true })}
              </dd>
            </div>
          </dl>
          {statusMessage ? (
            <FormStatusMessage variant="error">
              {statusMessage}
            </FormStatusMessage>
          ) : null}
          <div className="flex flex-col gap-4">
            <AlertDialogAction
              size="finance-submit"
              disabled={isClosing}
              onClick={(event) => {
                event.preventDefault()
                void handleCloseStatement()
              }}
            >
              {isClosing ? "Closing..." : "Close Statement"}
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
