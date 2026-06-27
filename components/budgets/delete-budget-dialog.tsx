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
  const { state, actions } = useFinance()
  const currentBudget = state.budgets.find((budgetRecord) => {
    const category = state.categories.find(
      (option) => option.id === budgetRecord.categoryId,
    )

    return category?.name === budget.category
  })

  const handleConfirmDelete = () => {
    if (!currentBudget) {
      return
    }

    actions.deleteBudget(currentBudget.id)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent variant="finance">
        <AlertDialogHeader className="pr-12 text-left">
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
            disabled={!currentBudget}
            onClick={handleConfirmDelete}
          >
            Delete Budget
          </AlertDialogAction>
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
