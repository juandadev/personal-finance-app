"use client"

import { X } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
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
      <AlertDialogContent className="bg-card max-w-140 gap-0 rounded-xl border-none p-8 shadow-xl sm:max-w-140">
        <AlertDialogHeader className="pr-12 text-left">
          <AlertDialogTitle className="text-[2rem] leading-tight font-bold tracking-[-0.02em]">
            Delete &lsquo;{budget.category}&rsquo;?
          </AlertDialogTitle>
          <AlertDialogDescription className="mt-5 text-sm leading-6">
            Are you sure you want to delete this budget? This action cannot be
            reversed, and all the data inside it will be removed forever.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogCancel asChild>
          <button
            type="button"
            aria-label="Close delete budget dialog"
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute top-9 right-8 flex size-7 items-center justify-center rounded-full border border-current bg-transparent p-0 shadow-none transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <X className="size-4" aria-hidden />
          </button>
        </AlertDialogCancel>

        <div className="mt-5 flex flex-col gap-5">
          <AlertDialogAction
            disabled={!currentBudget}
            onClick={handleConfirmDelete}
            className="h-13.25 rounded-lg bg-[#C94736] text-sm font-bold text-white shadow-none hover:bg-[#C94736]/90 focus-visible:ring-[#C94736]/30"
          >
            Yes, Confirm Deletion
          </AlertDialogAction>
          <AlertDialogCancel className="text-muted-foreground hover:text-foreground mx-auto h-auto border-none bg-transparent p-0 text-sm font-normal shadow-none hover:bg-transparent">
            No, Go Back
          </AlertDialogCancel>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
