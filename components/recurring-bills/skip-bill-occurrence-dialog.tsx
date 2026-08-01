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
import { MoneyAmount } from "@/components/money-amount"
import { formatDisplayDate } from "@/lib/format"
import type { RecurringBill, RecurringBillOccurrence } from "@/lib/types"

interface SkipBillOccurrenceDialogProps {
  bill: RecurringBill
  occurrence: RecurringBillOccurrence
  trigger?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function SkipBillOccurrenceDialog({
  bill,
  occurrence,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: SkipBillOccurrenceDialogProps) {
  const { actions } = useFinance()
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = controlledOnOpenChange ?? setInternalOpen
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
      {trigger ? (
        <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      ) : controlledOpen === undefined ? (
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="sm">
            Skip
          </Button>
        </AlertDialogTrigger>
      ) : null}
      <AlertDialogContent variant="finance">
        <AlertDialogHeader className="text-left">
          <AlertDialogCloseButton aria-label="Close skip bill dialog" />
          <AlertDialogTitle variant="finance">
            Skip This Payment?
          </AlertDialogTitle>
          <AlertDialogDescription variant="finance">
            Skipping records no money movement. The{" "}
            <strong>
              <MoneyAmount amount={occurrence.amount} forceDecimals />
            </strong>{" "}
            to <strong>{bill.name}</strong> payment due{" "}
            <strong>{formatDisplayDate(occurrence.dueDate)} </strong> will be
            marked as skipped and still counts toward the bill&apos;s progress.
          </AlertDialogDescription>
        </AlertDialogHeader>
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
