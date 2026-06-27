"use client"

import { useMemo, useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Label } from "@/components/ui/label"
import { useFinance } from "@/hooks/use-finance"
import { formatCurrency } from "@/lib/format"
import { parseDollarAmount } from "@/lib/finance/form-utils"
import { themeColorClasses } from "@/lib/theme-colors"
import type { Pot } from "@/lib/types"
import { cn } from "@/lib/utils"

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
            button: "Withdraw Money",
            description:
              "Enter the amount to withdraw from this pot. The preview shows the new saved total before you save.",
          }
        : {
            title: `Add to '${pot.name}'`,
            label: "Amount to Add",
            button: "Add Money",
            description:
              "Enter the amount to add to this pot. The preview shows the new saved total before you save.",
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
      <DialogContent variant="finance" showCloseButton={false}>
        <DialogHeader className="pr-12 text-left">
          <DialogTitle variant="finance">{copy.title}</DialogTitle>
          <DialogDescription variant="finance">
            {copy.description}
          </DialogDescription>
        </DialogHeader>

        <DialogCloseButton aria-label={`Close ${copy.title} dialog`} />

        <form className="mt-8" onSubmit={handleSubmit}>
          <div className="flex items-center justify-between gap-4">
            <p className="text-muted-foreground text-sm">New Amount</p>
            <p className="text-foreground text-3xl leading-tight font-bold tracking-tight">
              {formatCurrency(previewAmount, { forceDecimals: true })}
            </p>
          </div>

          <div className="mt-4">
            <div className="bg-background relative h-2 w-full overflow-hidden rounded-full">
              <div
                className="bg-foreground absolute inset-y-0 left-0 rounded-full"
                style={{
                  width: `${isWithdrawal ? clampedPreviewPercentage : clampedCurrentPercentage}%`,
                }}
              />
              <div
                className={cn(
                  "absolute inset-y-0 rounded-full",
                  isWithdrawal
                    ? "bg-destructive"
                    : themeColorClasses[pot.color].bg,
                )}
                style={{
                  left: `${deltaStart}%`,
                  width: `${deltaWidth}%`,
                }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span
                className={cn(
                  isWithdrawal
                    ? "text-destructive"
                    : ["font-bold", themeColorClasses[pot.color].text],
                )}
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
            <CurrencyInput
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
            />
            {amountError && (
              <p
                id={`${mode}-pot-amount-error-${pot.id}`}
                className="text-destructive text-xs"
              >
                {amountError}
              </p>
            )}
          </div>

          <Button type="submit" size="finance-submit" className="mt-5">
            {copy.button}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
