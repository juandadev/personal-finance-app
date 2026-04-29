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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useFinance } from "@/hooks/use-finance"
import {
  formatDollarInput,
  parseDollarAmount,
  themeOptions,
} from "@/lib/finance/form-utils"
import type { Pot } from "@/lib/types"
import { cn } from "@/lib/utils"

const maxPotNameLength = 30

interface EditPotDialogProps {
  pot: Pot
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditPotDialog({
  pot,
  open,
  onOpenChange,
}: EditPotDialogProps) {
  const { state, actions } = useFinance()
  const currentPot = state.pots.find((potRecord) => potRecord.id === pot.id)
  const [name, setName] = useState(pot.name)
  const [target, setTarget] = useState(formatDollarInput(pot.target))
  const [themeColor, setThemeColor] = useState<string>(pot.color)
  const [nameError, setNameError] = useState("")
  const [targetError, setTargetError] = useState("")

  const existingPotNames = useMemo(
    () =>
      new Set(
        state.pots
          .filter((potRecord) => potRecord.id !== currentPot?.id)
          .map((potRecord) => potRecord.name.trim().toLowerCase()),
      ),
    [currentPot?.id, state.pots],
  )
  const usedThemeColors = useMemo(
    () =>
      new Set(
        state.pots
          .filter((potRecord) => potRecord.id !== currentPot?.id)
          .map((potRecord) => potRecord.themeColor.toLowerCase()),
      ),
    [currentPot?.id, state.pots],
  )
  const selectedTheme = themeOptions.find((theme) => theme.value === themeColor)
  const charactersLeft = maxPotNameLength - name.length

  const resetForm = () => {
    setName(pot.name)
    setTarget(formatDollarInput(pot.target))
    setThemeColor(pot.color)
    setNameError("")
    setTargetError("")
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      resetForm()
    }

    onOpenChange(nextOpen)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!currentPot) {
      return
    }

    const trimmedName = name.trim()
    const targetCents = parseDollarAmount(target)
    let hasError = false

    if (!trimmedName) {
      setNameError("Enter a pot name.")
      hasError = true
    } else if (existingPotNames.has(trimmedName.toLowerCase())) {
      setNameError("A pot with this name already exists.")
      hasError = true
    }

    if (targetCents === null) {
      setTargetError("Enter a target greater than $0.")
      hasError = true
    }

    if (hasError || targetCents === null) {
      return
    }

    actions.updatePot(currentPot.id, {
      name: trimmedName,
      targetCents,
      themeColor,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="bg-card max-w-140 gap-0 rounded-xl border-none p-8 shadow-xl sm:max-w-140"
        showCloseButton={false}
      >
        <DialogHeader className="pr-12 text-left">
          <DialogTitle className="text-[2rem] leading-tight font-bold tracking-[-0.02em]">
            Edit Pot
          </DialogTitle>
          <DialogDescription className="mt-5 text-sm leading-6">
            If your saving targets change, feel free to update your pots.
          </DialogDescription>
        </DialogHeader>

        <DialogClose asChild>
          <button
            type="button"
            aria-label="Close edit pot dialog"
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute top-9 right-8 flex size-7 items-center justify-center rounded-full border border-current transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <X className="size-4" aria-hidden />
          </button>
        </DialogClose>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label
              htmlFor="edit-pot-name"
              className="text-muted-foreground text-xs font-bold"
            >
              Pot Name
            </Label>
            <Input
              id="edit-pot-name"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                setNameError("")
              }}
              maxLength={maxPotNameLength}
              aria-invalid={nameError ? "true" : "false"}
              aria-describedby={
                nameError ? "edit-pot-name-error" : "edit-pot-name-characters"
              }
              className="h-11 rounded-lg border-[#98908B] px-5 text-sm"
            />
            <div className="flex justify-end">
              {nameError ? (
                <p
                  id="edit-pot-name-error"
                  className="text-destructive text-xs"
                >
                  {nameError}
                </p>
              ) : (
                <p
                  id="edit-pot-name-characters"
                  className="text-muted-foreground text-xs"
                  aria-live="polite"
                >
                  {charactersLeft} characters left
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="edit-pot-target"
              className="text-muted-foreground text-xs font-bold"
            >
              Target
            </Label>
            <div className="relative">
              <span
                aria-hidden
                className="text-muted-foreground absolute top-1/2 left-5 -translate-y-1/2 text-sm"
              >
                $
              </span>
              <Input
                id="edit-pot-target"
                inputMode="decimal"
                value={target}
                onChange={(event) => {
                  setTarget(event.target.value)
                  setTargetError("")
                }}
                aria-invalid={targetError ? "true" : "false"}
                aria-describedby={
                  targetError ? "edit-pot-target-error" : undefined
                }
                className="h-11 rounded-lg border-[#98908B] pl-10 text-sm"
              />
            </div>
            {targetError && (
              <p id="edit-pot-target-error" className="text-destructive text-xs">
                {targetError}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="edit-pot-theme"
              className="text-muted-foreground text-xs font-bold"
            >
              Theme
            </Label>
            <Select value={themeColor} onValueChange={setThemeColor}>
              <SelectTrigger
                id="edit-pot-theme"
                className="h-11 w-full rounded-lg border-[#98908B] px-5 text-sm"
              >
                <SelectValue>
                  <span className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className="size-4 rounded-full"
                      style={{ backgroundColor: selectedTheme?.value }}
                    />
                    {selectedTheme?.label}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-107.5">
                {themeOptions.map((theme) => (
                  <SelectItem
                    key={theme.value}
                    value={theme.value}
                    className="border-border min-h-11 border-b py-3 pr-8 pl-4 last:border-b-0"
                  >
                    <span className="flex w-full items-center justify-between gap-6">
                      <span
                        className={cn(
                          "flex items-center gap-3",
                          usedThemeColors.has(theme.value.toLowerCase()) &&
                            "opacity-35",
                        )}
                      >
                        <span
                          aria-hidden
                          className="size-4 rounded-full"
                          style={{ backgroundColor: theme.value }}
                        />
                        {theme.label}
                      </span>
                      {usedThemeColors.has(theme.value.toLowerCase()) && (
                        <span className="text-muted-foreground text-xs">
                          Already used
                        </span>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="submit"
            disabled={!currentPot}
            className="h-13.25 w-full rounded-lg text-sm font-bold"
          >
            Save Changes
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
