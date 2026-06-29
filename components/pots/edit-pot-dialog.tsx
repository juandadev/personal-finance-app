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
import { ThemeSelect } from "@/components/theme-select"
import { AuthStatusMessage } from "@/components/auth/auth-page-shell"
import { useFinance } from "@/hooks/use-finance"
import { formatDollarInput, parseDollarAmount } from "@/lib/finance/form-utils"
import type { ThemeColor } from "@/lib/theme-colors"
import type { Pot } from "@/lib/types"

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
  const [statusMessage, setStatusMessage] = useState("")
  const [isSaving, setIsSaving] = useState(false)

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
          .map((potRecord) => potRecord.theme_color.toLowerCase()),
      ),
    [currentPot?.id, state.pots],
  )
  const charactersLeft = maxPotNameLength - name.length

  const resetForm = () => {
    setName(pot.name)
    setTarget(formatDollarInput(pot.target))
    setThemeColor(pot.color)
    setNameError("")
    setTargetError("")
    setStatusMessage("")
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      resetForm()
    }

    onOpenChange(nextOpen)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatusMessage("")

    if (!currentPot) {
      return
    }

    const trimmedName = name.trim()
    const target_cents = parseDollarAmount(target)
    let hasError = false

    if (!trimmedName) {
      setNameError("Enter a pot name.")
      hasError = true
    } else if (existingPotNames.has(trimmedName.toLowerCase())) {
      setNameError("A pot with this name already exists.")
      hasError = true
    }

    if (target_cents === null) {
      setTargetError("Enter a target greater than $0.")
      hasError = true
    }

    if (hasError || target_cents === null) {
      return
    }

    setIsSaving(true)

    const result = await actions.updatePot(currentPot.id, {
      name: trimmedName,
      target_cents,
      theme_color: themeColor,
    })

    setIsSaving(false)

    if (!result.ok) {
      setStatusMessage(result.message)
      return
    }

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

          <ThemeSelect
            id="edit-pot-theme"
            value={themeColor}
            onValueChange={setThemeColor}
            usedThemeColors={usedThemeColors}
          />

          <Button
            type="submit"
            size="finance-submit"
            disabled={!currentPot || isSaving}
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
          {statusMessage ? (
            <AuthStatusMessage variant="error">
              {statusMessage}
            </AuthStatusMessage>
          ) : null}
        </form>
      </DialogContent>
    </Dialog>
  )
}
