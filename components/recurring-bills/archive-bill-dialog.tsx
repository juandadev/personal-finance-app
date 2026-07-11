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
import type { RecurringBill } from "@/lib/types"

interface ArchiveBillDialogProps {
  bill: RecurringBill
  trigger?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ArchiveBillDialog({
  bill,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: ArchiveBillDialogProps) {
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
  const [isArchiving, setIsArchiving] = useState(false)

  const handleArchive = async () => {
    setIsArchiving(true)
    setStatusMessage("")

    const result = await actions.archiveRecurringBill(bill.id)

    setIsArchiving(false)

    if (!result.ok) {
      setStatusMessage(result.message)
      return
    }

    setOpen(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {!isControlled ? (
        <AlertDialogTrigger asChild>
          {trigger ?? (
            <Button variant="ghost" size="sm" className="text-destructive">
              Archive
            </Button>
          )}
        </AlertDialogTrigger>
      ) : null}
      <AlertDialogContent variant="finance">
        <AlertDialogHeader className="text-left">
          <AlertDialogTitle variant="finance">
            Archive {bill.name}?
          </AlertDialogTitle>
          <AlertDialogDescription variant="finance">
            Archiving cancels the subscription in the app: no new payments will
            be scheduled, and its payment history and transactions stay intact.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogCloseButton aria-label="Close archive bill dialog" />
        <div className="mt-5 space-y-5">
          {statusMessage ? (
            <FormStatusMessage variant="error">
              {statusMessage}
            </FormStatusMessage>
          ) : null}
          <div className="flex flex-col gap-4">
            <AlertDialogAction
              size="finance-submit"
              disabled={isArchiving}
              onClick={(event) => {
                event.preventDefault()
                void handleArchive()
              }}
            >
              {isArchiving ? "Archiving..." : "Archive Bill"}
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
