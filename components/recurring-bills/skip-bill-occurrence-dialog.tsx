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
import { FormStatusMessage } from "@/components/ui/form"
import { useFinance } from "@/hooks/use-finance"
import { formatCurrency, formatDisplayDate } from "@/lib/format"
import type { RecurringBill, RecurringBillOccurrence } from "@/lib/types"

interface SkipBillOccurrenceDialogProps {
  bill: RecurringBill
  occurrence: RecurringBillOccurrence
  trigger?: ReactNode
}

export function SkipBillOccurrenceDialog({
  bill,
  occurrence,
  trigger,
}: SkipBillOccurrenceDialogProps) {
  const { actions } = useFinance()
  const [open, setOpen] = useState(false)
  const [statusMessage, setStatusMessage] = useState("")
  const [isSkipping, setIsSkipping] = useState(false)

  const handleSkip = async () => {
    setIsSkipping(true)
    setStatusMessage("")

    const result = await actions.skipRecurringBillOccurrence(
      bill.id,
      occurrence.dueDate,
    )

    setIsSkipping(false)

    if (!result.ok) {
      setStatusMessage(result.message)
      return
    }

    setOpen(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm">
            Skip
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent variant="finance">
        <AlertDialogHeader className="text-left">
          <AlertDialogTitle variant="finance">
            Skip This Payment?
          </AlertDialogTitle>
          <AlertDialogDescription variant="finance">
            Skipping records no money movement. The{" "}
            {formatCurrency(occurrence.amount, { forceDecimals: true })}{" "}
            {bill.name} payment due {formatDisplayDate(occurrence.dueDate)} will
            be marked as skipped and still counts toward the bill&apos;s
            progress.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogCloseButton aria-label="Close skip bill dialog" />
        <div className="mt-5 space-y-5">
          {statusMessage ? (
            <FormStatusMessage variant="error">
              {statusMessage}
            </FormStatusMessage>
          ) : null}
          <div className="flex flex-col gap-4">
            <AlertDialogAction
              size="finance-submit"
              disabled={isSkipping}
              onClick={(event) => {
                event.preventDefault()
                void handleSkip()
              }}
            >
              {isSkipping ? "Skipping..." : "Skip Payment"}
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
