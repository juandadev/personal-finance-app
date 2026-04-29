"use client"

import { useMemo, useState, type FormEvent } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useFinance } from "@/hooks/use-finance"
import { formatCurrency } from "@/lib/format"
import { parseDollarAmount } from "@/lib/finance/form-utils"
import type { Pot } from "@/lib/types"

type PotTransferMode = "add" | "withdraw"

interface PotTransferDialogProps {
  pot: Pot
  mode: PotTransferMode
  open: boolean
  onOpenChange: (open: boolean) => void
}

function getPreviewAmount(
  currentAmount: number,
  inputAmount: string,
  mode: PotTransferMode,
) {
  const parsedCents = parseDollarAmount(inputAmount)

  if (parsedCents === null) {
    return currentAmount
  }

  const amount = parsedCents / 100

  if (mode === "withdraw") {
    return Math.max(currentAmount - amount, 0)
  }

  return currentAmount + amount
}

export function PotTransferDialog({
  pot,
  mode,
  open,
  onOpenChange,
}: PotTransferDialogProps) {
  const { actions } = useFinance()
  const [amount, setAmount] = useState("")
  const [amountError, setAmountError] = useState("")
  const isWithdrawal = mode === "withdraw"
  const previewAmount = getPreviewAmount(pot.amount, amount, mode)
  const currentPercentage = (pot.amount / pot.target) * 100
  const previewPercentage = (previewAmount / pot.target) * 100
  const clampedCurrentPercentage = Math.min(currentPercentage, 100)
  const clampedPreviewPercentage = Math.min(previewPercentage, 100)
  const deltaStart = Math.min(
    clampedCurrentPercentage,
    clampedPreviewPercentage,
  )
  const deltaWidth = Math.abs(
    clampedPreviewPercentage - clampedCurrentPercentage,
  )

  const copy = useMemo(
    () =>
      isWithdrawal
        ? {
            title: `Withdraw from '${pot.name}'`,
            label: "Amount to Withdraw",
            button: "Confirm Withdrawal",
          }
        : {
            title: `Add to '${pot.name}'`,
            label: "Amount to Add",
            button: "Confirm Addition",
          },
    [isWithdrawal, pot.name],
  )

  const resetForm = () => {
    setAmount("")
    setAmountError("")
  }

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen)

    if (!nextOpen) {
      resetForm()
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const amountCents = parseDollarAmount(amount)

    if (amountCents === null) {
      setAmountError("Enter an amount greater than $0.")
      return
    }

    if (isWithdrawal && amountCents > Math.round(pot.amount * 100)) {
      setAmountError("You cannot withdraw more than this pot contains.")
      return
    }

    if (isWithdrawal) {
      actions.withdrawFromPot(pot.id, amountCents)
    } else {
      actions.depositToPot(pot.id, amountCents)
    }

    onOpenChange(false)
    resetForm()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="bg-card max-w-140 gap-0 rounded-xl border-none p-8 shadow-xl sm:max-w-140"
        showCloseButton={false}
      >
        <DialogHeader className="pr-12 text-left">
          <DialogTitle className="text-[2rem] leading-tight font-bold tracking-[-0.02em]">
            {copy.title}
          </DialogTitle>
          <DialogDescription className="mt-5 text-sm leading-6">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus
            hendrerit. Pellentesque aliquet nibh nec urna. In nisi neque,
            aliquet.
          </DialogDescription>
        </DialogHeader>

        <DialogClose asChild>
          <button
            type="button"
            aria-label={`Close ${copy.title} dialog`}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute top-9 right-8 flex size-7 items-center justify-center rounded-full border border-current transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <X className="size-4" aria-hidden />
          </button>
        </DialogClose>

        <form className="mt-8" onSubmit={handleSubmit}>
          <div className="flex items-center justify-between gap-4">
            <p className="text-muted-foreground text-sm">New Amount</p>
            <p className="text-foreground text-[2rem] leading-tight font-bold tracking-[-0.02em]">
              {formatCurrency(previewAmount, { forceDecimals: true })}
            </p>
          </div>

          <div className="mt-4">
            <div className="bg-background relative h-2 w-full overflow-hidden rounded-full">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-[#201F24]"
                style={{
                  width: `${isWithdrawal ? clampedPreviewPercentage : clampedCurrentPercentage}%`,
                }}
              />
              <div
                className="absolute inset-y-0 rounded-full"
                style={{
                  left: `${deltaStart}%`,
                  width: `${deltaWidth}%`,
                  backgroundColor: isWithdrawal ? "#C94736" : pot.color,
                }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span
                className={isWithdrawal ? "text-[#C94736]" : "font-bold"}
                style={{ color: isWithdrawal ? undefined : pot.color }}
              >
                {previewPercentage.toFixed(previewPercentage < 10 ? 2 : 1)}%
              </span>
              <span className="text-muted-foreground">
                Target of {formatCurrency(pot.target)}
              </span>
            </div>
          </div>

          <div className="mt-8 space-y-2">
            <Label
              htmlFor={`${mode}-pot-amount-${pot.id}`}
              className="text-muted-foreground text-xs font-bold"
            >
              {copy.label}
            </Label>
            <div className="relative">
              <span
                aria-hidden
                className="text-muted-foreground absolute top-1/2 left-5 -translate-y-1/2 text-sm"
              >
                $
              </span>
              <Input
                id={`${mode}-pot-amount-${pot.id}`}
                inputMode="decimal"
                value={amount}
                onChange={(event) => {
                  setAmount(event.target.value)
                  setAmountError("")
                }}
                placeholder={isWithdrawal ? "e.g. 20" : "e.g. 400"}
                aria-invalid={amountError ? "true" : "false"}
                aria-describedby={
                  amountError ? `${mode}-pot-amount-error-${pot.id}` : undefined
                }
                className="h-11 rounded-lg border-[#98908B] pl-10 text-sm"
              />
            </div>
            {amountError && (
              <p
                id={`${mode}-pot-amount-error-${pot.id}`}
                className="text-destructive text-xs"
              >
                {amountError}
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="mt-5 h-13.25 w-full rounded-lg text-sm font-bold"
          >
            {copy.button}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
