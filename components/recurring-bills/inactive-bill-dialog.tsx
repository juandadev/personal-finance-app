"use client"

import { useMemo, useState, type ReactNode } from "react"

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
import {
  getNextDueDateAfter,
  todayIsoDate,
} from "@/lib/finance/recurring-bill-schedule"
import { formatDisplayDate } from "@/lib/format"
import type { RecurringBill } from "@/lib/types"

type InactiveBillMode = "pause" | "archive"

interface InactiveBillDialogProps {
  bill: RecurringBill
  mode: InactiveBillMode
  trigger?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function InactiveBillDialog({
  bill,
  mode,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: InactiveBillDialogProps) {
  const { actions } = useFinance()
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen
  const setOpen = (nextOpen: boolean) => {
    if (!isControlled) {
      setUncontrolledOpen(nextOpen)
    }

    onOpenChange?.(nextOpen)
  }
  const [statusMessage, setStatusMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const today = todayIsoDate()
  const schedulesEndOnCard = Boolean(bill.creditCardId)
  const scheduledEndDate = useMemo(() => {
    if (!schedulesEndOnCard) {
      return null
    }

    return getNextDueDateAfter(
      {
        frequency: bill.frequency,
        first_due_date: bill.firstDueDate,
        total_payments: bill.totalPayments ?? null,
      },
      today,
    )
  }, [
    bill.firstDueDate,
    bill.frequency,
    bill.totalPayments,
    schedulesEndOnCard,
    today,
  ])

  const title =
    mode === "pause" ? `Pause ${bill.concept}?` : `Cancel ${bill.concept}?`
  const submitLabel =
    mode === "pause"
      ? isSubmitting
        ? "Pausing..."
        : "Pause Bill"
      : isSubmitting
        ? "Canceling..."
        : "Cancel Bill"
  const action =
    mode === "pause" ? actions.pauseRecurringBill : actions.archiveRecurringBill

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setStatusMessage("")

    const result = await action(bill.id)

    setIsSubmitting(false)

    if (!result.ok) {
      setStatusMessage(result.message)
      return
    }

    setOpen(false)
  }

  const resetState = () => {
    setStatusMessage("")
  }

  const description =
    schedulesEndOnCard && scheduledEndDate ? (
      <>
        This bill stays active until{" "}
        {formatDisplayDate(scheduledEndDate, "d MMM, yyyy")}. The current
        statement charge stays on your card, and that date will not be charged
        again.
        {mode === "pause"
          ? " You can undo before then, or resume later after it pauses."
          : " You can undo before then."}
      </>
    ) : mode === "pause" ? (
      "Pausing stops future occurrences. You can resume later with a new start date."
    ) : (
      "Canceling stops future occurrences while keeping payment history and transactions intact."
    )

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          resetState()
        }

        setOpen(nextOpen)
      }}
    >
      {!isControlled ? (
        <AlertDialogTrigger asChild>
          {trigger ?? (
            <Button
              variant="ghost"
              size="sm"
              className={mode === "archive" ? "text-destructive" : undefined}
            >
              {mode === "pause" ? "Pause" : "Cancel"}
            </Button>
          )}
        </AlertDialogTrigger>
      ) : null}
      <AlertDialogContent variant="finance">
        <AlertDialogHeader className="text-left">
          <AlertDialogCloseButton
            aria-label={`Close ${mode === "pause" ? "pause" : "cancel"} bill dialog`}
          />
          <AlertDialogTitle variant="finance">{title}</AlertDialogTitle>
          <AlertDialogDescription variant="finance">
            {description}
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
              disabled={isSubmitting}
              onClick={(event) => {
                event.preventDefault()
                void handleSubmit()
              }}
            >
              {submitLabel}
            </AlertDialogAction>
            <AlertDialogCancel
              variant="muted-link"
              size="text-link"
              className="mx-auto"
            >
              Close
            </AlertDialogCancel>
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function ArchiveBillDialog(
  props: Omit<InactiveBillDialogProps, "mode">,
) {
  return <InactiveBillDialog {...props} mode="archive" />
}
