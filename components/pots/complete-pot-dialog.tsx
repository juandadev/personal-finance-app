"use client"

import { CheckCircleIcon, CheckIcon } from "@phosphor-icons/react"
import { useState } from "react"
import { toast } from "sonner"

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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useFinance } from "@/hooks/use-finance"
import type { Pot } from "@/lib/types"

export function CompletePotDialog({ pot }: { pot: Pot }) {
  const { actions } = useFinance()
  const [open, setOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")

  const handleOpenChange = (nextOpen: boolean) => {
    if (isSaving || (nextOpen && pot.isCompleted)) return

    setError("")
    setOpen(nextOpen)
  }

  const handleComplete = async () => {
    if (isSaving) return

    setIsSaving(true)
    setError("")
    const result = await actions.updatePot(pot.id, { is_completed: true })
    setIsSaving(false)

    if (!result.ok) {
      setError(result.message)
      return
    }

    setOpen(false)
    toast.success("Pot marked as completed.")
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="surface"
              size="icon-lg"
              className="aria-disabled:bg-accent aria-disabled:text-accent-foreground size-11 touch-manipulation aria-disabled:cursor-default"
              aria-label={pot.isCompleted ? "Completed" : "Mark as completed"}
              aria-disabled={pot.isCompleted}
            >
              {pot.isCompleted ? (
                <CheckCircleIcon className="size-5" weight="fill" aria-hidden />
              ) : (
                <CheckIcon className="size-5" weight="fill" aria-hidden />
              )}
            </Button>
          </AlertDialogTrigger>
        </TooltipTrigger>
        <TooltipContent sideOffset={6}>
          {pot.isCompleted ? "Completed" : "Marked as completed"}
        </TooltipContent>
      </Tooltip>

      <AlertDialogContent variant="finance">
        <AlertDialogHeader className="text-left">
          <AlertDialogCloseButton
            aria-label="Close completion dialog"
            disabled={isSaving}
          />
          <AlertDialogTitle variant="finance">
            Complete &lsquo;{pot.name}&rsquo;?
          </AlertDialogTitle>
          <AlertDialogDescription variant="finance">
            This pot will count as a completed goal. Its balance will be removed
            from Total savings.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="mt-5 flex flex-col gap-4">
          {error ? (
            <FormStatusMessage variant="error">{error}</FormStatusMessage>
          ) : null}
          <AlertDialogAction
            size="finance-submit"
            disabled={isSaving}
            onClick={(event) => {
              event.preventDefault()
              void handleComplete()
            }}
          >
            {isSaving ? "Saving..." : "Mark as completed"}
          </AlertDialogAction>
          <AlertDialogCancel
            variant="muted-link"
            size="text-link"
            className="mx-auto"
            disabled={isSaving}
          >
            Cancel
          </AlertDialogCancel>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
