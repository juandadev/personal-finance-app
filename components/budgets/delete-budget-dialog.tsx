"use client"

import { useState } from "react"

import { AuthStatusMessage } from "@/components/auth/auth-page-shell"
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
import { useFinance } from "@/hooks/use-finance"
import type { Budget } from "@/lib/types"

interface DeleteBudgetDialogProps {
  budget: Budget
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteBudgetDialog({
  budget,
  open,
  onOpenChange,
}: DeleteBudgetDialogProps) {
  const { actions } = useFinance()
  const [statusMessage, setStatusMessage] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)

  const handleConfirmDelete = async () => {
    setIsDeleting(true)
    setStatusMessage("")

    const result = await actions.deleteBudget(budget.id)

    setIsDeleting(false)

    if (!result.ok) {
      setStatusMessage(result.message)
      return
    }

    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent variant="finance">
        <AlertDialogHeader className="text-left">
          <AlertDialogTitle variant="finance">
            Delete &lsquo;{budget.category}&rsquo;?
          </AlertDialogTitle>
          <AlertDialogDescription variant="finance">
            Are you sure you want to delete this budget? This action cannot be
            reversed, and all the data inside it will be removed forever.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogCloseButton aria-label="Close delete budget dialog" />

        <div className="mt-5 flex flex-col gap-5">
          <AlertDialogAction
            variant="destructive"
            size="finance-submit"
            disabled={isDeleting}
            onClick={(event) => {
              event.preventDefault()
              void handleConfirmDelete()
            }}
          >
            {isDeleting ? "Deleting..." : "Delete Budget"}
          </AlertDialogAction>
          {statusMessage ? (
            <AuthStatusMessage variant="error">
              {statusMessage}
            </AuthStatusMessage>
          ) : null}
          <AlertDialogCancel
            variant="muted-link"
            size="text-link"
            className="mx-auto"
          >
            Keep Budget
          </AlertDialogCancel>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
