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
import { formatDisplayDate } from "@/lib/format"
import type { RecurringBill } from "@/lib/types"

interface UndoScheduledEndDialogProps {
  bill: RecurringBill
  trigger?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function UndoScheduledEndDialog({
  bill,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: UndoScheduledEndDialogProps) {
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

  const endDate = bill.scheduledEndDate
  const endLabel =
    bill.scheduledEndMode === "pause" ? "pause" : "scheduled cancel"

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setStatusMessage("")

    const result = await actions.undoScheduledRecurringBillEnd(bill.id)

    setIsSubmitting(false)

    if (!result.ok) {
      setStatusMessage(result.message)
      return
    }

    setOpen(false)
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setStatusMessage("")
        }

        setOpen(nextOpen)
      }}
    >
      {!isControlled ? (
        <AlertDialogTrigger asChild>
          {trigger ?? (
            <Button variant="ghost" size="sm">
              Undo
            </Button>
          )}
        </AlertDialogTrigger>
      ) : null}
      <AlertDialogContent variant="finance">
        <AlertDialogHeader className="text-left">
          <AlertDialogCloseButton aria-label="Close undo scheduled end dialog" />
          <AlertDialogTitle variant="finance">
            Keep {bill.concept} active?
          </AlertDialogTitle>
          <AlertDialogDescription variant="finance">
            {endDate ? (
              <>
                This clears the {endLabel} on{" "}
                {formatDisplayDate(endDate, "d MMM, yyyy")}. The bill will
                continue on its normal schedule.
              </>
            ) : (
              "This clears the scheduled end and restores the normal schedule."
            )}
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
              {isSubmitting ? "Saving..." : "Keep Bill Active"}
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
