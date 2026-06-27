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
import { themeColorClasses, type ThemeColor } from "@/lib/theme-colors"
import type { Pot } from "@/lib/types"
import { cn } from "@/lib/utils"

const maxPotNameLength = 30

interface EditPotDialogProps {
  pot: Pot
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditPotDialog({ pot, open, onOpenChange }: EditPotDialogProps) {
  const { state, actions } = useFinance()
  const currentPot = state.pots.find((potRecord) => potRecord.id === pot.id)
  const [name, setName] = useState(pot.name)
  const [target, setTarget] = useState(formatDollarInput(pot.target))
  const [themeColor, setThemeColor] = useState<ThemeColor>(pot.color)
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
      <DialogContent variant="finance" showCloseButton={false}>
        <DialogHeader className="pr-12 text-left">
          <DialogTitle variant="finance">Edit Pot</DialogTitle>
          <DialogDescription variant="finance">
            If your saving targets change, feel free to update your pots.
          </DialogDescription>
        </DialogHeader>

        <DialogCloseButton aria-label="Close edit pot dialog" />

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
            <CurrencyInput
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
            />
            {targetError && (
              <p
                id="edit-pot-target-error"
                className="text-destructive text-xs"
              >
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
            <Select
              value={themeColor}
              onValueChange={(value) => setThemeColor(value as ThemeColor)}
            >
              <SelectTrigger id="edit-pot-theme" variant="form">
                <SelectValue>
                  <span className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className={cn(
                        "size-4 rounded-full",
                        selectedTheme &&
                          themeColorClasses[selectedTheme.value].bg,
                      )}
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
                    variant="form"
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
                          className={cn(
                            "size-4 rounded-full",
                            themeColorClasses[theme.value].bg,
                          )}
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

          <Button type="submit" size="finance-submit" disabled={!currentPot}>
            Save Changes
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
