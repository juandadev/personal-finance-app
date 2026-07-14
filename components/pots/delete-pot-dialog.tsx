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
import type { Pot } from "@/lib/types"

interface DeletePotDialogProps {
  pot: Pot
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeletePotDialog({
  pot,
  open,
  onOpenChange,
}: DeletePotDialogProps) {
  const { state, actions } = useFinance()
  const [statusMessage, setStatusMessage] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const currentPot = state.pots.find((potRecord) => potRecord.id === pot.id)

  const handleConfirmDelete = async () => {
    if (!currentPot) {
      return
    }

    setIsDeleting(true)
    setStatusMessage("")

    const result = await actions.deletePot(currentPot.id)

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
          <AlertDialogCloseButton aria-label="Close delete pot dialog" />
          <AlertDialogTitle variant="finance">
            Delete &lsquo;{pot.name}&rsquo;?
          </AlertDialogTitle>
          <AlertDialogDescription variant="finance">
            Are you sure you want to delete this pot? This action cannot be
            reversed, and all the data inside it will be removed forever.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="mt-5 flex flex-col gap-5">
          <AlertDialogAction
            variant="destructive"
            size="finance-submit"
            disabled={!currentPot || isDeleting}
            onClick={(event) => {
              event.preventDefault()
              void handleConfirmDelete()
            }}
          >
            {isDeleting ? "Deleting..." : "Delete Pot"}
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
            Keep Pot
          </AlertDialogCancel>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
