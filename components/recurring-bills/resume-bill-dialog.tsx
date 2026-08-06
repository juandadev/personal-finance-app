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
import { FormField, FormStatusMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useFinance } from "@/hooks/use-finance"
import {
  getDefaultResumeStartDate,
  todayIsoDate,
} from "@/lib/finance/recurring-bill-schedule"
import type { RecurringBill } from "@/lib/types"

interface ResumeBillDialogProps {
  bill: RecurringBill
  trigger?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ResumeBillDialog({
  bill,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: ResumeBillDialogProps) {
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
  const today = todayIsoDate()
  const defaultStartDate = useMemo(
    () => getDefaultResumeStartDate(bill.firstDueDate, bill.frequency, today),
    [bill.firstDueDate, bill.frequency, today],
  )
  const [startDate, setStartDate] = useState(defaultStartDate)
  const [statusMessage, setStatusMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleResume = async () => {
    setIsSubmitting(true)
    setStatusMessage("")

    const result = await actions.resumeRecurringBill(bill.id, startDate)

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
        if (nextOpen) {
          setStartDate(defaultStartDate)
          setStatusMessage("")
        }

        setOpen(nextOpen)
      }}
    >
      {!isControlled ? (
        <AlertDialogTrigger asChild>
          {trigger ?? (
            <Button variant="ghost" size="sm">
              Resume
            </Button>
          )}
        </AlertDialogTrigger>
      ) : null}
      <AlertDialogContent variant="finance">
        <AlertDialogHeader className="text-left">
          <AlertDialogCloseButton aria-label="Close resume bill dialog" />
          <AlertDialogTitle variant="finance">
            Resume {bill.concept}?
          </AlertDialogTitle>
          <AlertDialogDescription variant="finance">
            Choose when this bill should start again. Future occurrences will
            follow from this date.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="mt-5 space-y-5">
          <FormField id="resume-start-date" label="Start date">
            {(field) => (
              <Input
                {...field}
                type="date"
                min={today}
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            )}
          </FormField>
          {statusMessage ? (
            <FormStatusMessage variant="error">
              {statusMessage}
            </FormStatusMessage>
          ) : null}
          <div className="flex flex-col gap-4">
            <AlertDialogAction
              size="finance-submit"
              disabled={isSubmitting || !startDate}
              onClick={(event) => {
                event.preventDefault()
                void handleResume()
              }}
            >
              {isSubmitting ? "Resuming..." : "Resume Bill"}
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
