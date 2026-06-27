"use client"

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
  const currentPot = state.pots.find((potRecord) => potRecord.id === pot.id)

  const handleConfirmDelete = () => {
    if (!currentPot) {
      return
    }

    actions.deletePot(currentPot.id)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent variant="finance">
        <AlertDialogHeader className="pr-12 text-left">
          <AlertDialogTitle variant="finance">
            Delete &lsquo;{pot.name}&rsquo;?
          </AlertDialogTitle>
          <AlertDialogDescription variant="finance">
            Are you sure you want to delete this pot? This action cannot be
            reversed, and all the data inside it will be removed forever.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogCloseButton aria-label="Close delete pot dialog" />

        <div className="mt-5 flex flex-col gap-5">
          <AlertDialogAction
            variant="destructive"
            size="finance-submit"
            disabled={!currentPot}
            onClick={handleConfirmDelete}
          >
            Delete Pot
          </AlertDialogAction>
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
