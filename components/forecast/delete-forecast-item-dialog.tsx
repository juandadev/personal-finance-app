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
} from "@/components/ui/alert-dialog"
import { FormStatusMessage } from "@/components/ui/form"
import { useFinance } from "@/hooks/use-finance"
import type { CashForecastAdjustmentRecord } from "@/lib/finance/types"

interface DeleteForecastItemDialogProps {
  adjustment: CashForecastAdjustmentRecord
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted?: () => void
}

export function DeleteForecastItemDialog({
  adjustment,
  open,
  onOpenChange,
  onDeleted,
}: DeleteForecastItemDialogProps) {
  const { actions } = useFinance()
  const [isDeleting, setIsDeleting] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen)

    if (nextOpen) {
      setErrorMessage("")
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    setErrorMessage("")

    const result = await actions.deleteCashForecastAdjustment(adjustment.id)

    setIsDeleting(false)

    if (!result.ok) {
      setErrorMessage(result.message)
      return
    }

    onOpenChange(false)
    onDeleted?.()
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent variant="finance">
        <AlertDialogHeader className="text-left">
          <AlertDialogCloseButton aria-label="Close delete forecast item dialog" />
          <AlertDialogTitle variant="finance">
            Delete &lsquo;{adjustment.name}&rsquo;?
          </AlertDialogTitle>
          <AlertDialogDescription variant="finance">
            This removes the item from every affected forecast month. It does
            not change transactions or account balances.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="mt-5 flex flex-col gap-5">
          {errorMessage ? (
            <FormStatusMessage variant="error">
              {errorMessage}
            </FormStatusMessage>
          ) : null}
          <AlertDialogAction
            variant="destructive"
            size="finance-submit"
            disabled={isDeleting}
            onClick={(event) => {
              event.preventDefault()
              void handleDelete()
            }}
          >
            {isDeleting ? "Deleting forecast item..." : "Delete Forecast Item"}
          </AlertDialogAction>
          <AlertDialogCancel
            variant="muted-link"
            size="text-link"
            className="mx-auto"
          >
            Keep Forecast Item
          </AlertDialogCancel>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
