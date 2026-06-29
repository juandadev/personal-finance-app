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
  DialogTrigger,
} from "@/components/ui/dialog"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ThemeSelect } from "@/components/theme-select"
import { AuthStatusMessage } from "@/components/auth/auth-page-shell"
import { useFinance } from "@/hooks/use-finance"
import { parseDollarAmount, themeOptions } from "@/lib/finance/form-utils"
import type { ThemeColor } from "@/lib/theme-colors"

const maxPotNameLength = 30

export function AddPotDialog() {
  const { state, actions } = useFinance()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [target, setTarget] = useState("")
  const [themeColor, setThemeColor] = useState<ThemeColor>(
    themeOptions[0].value,
  )
  const [nameError, setNameError] = useState("")
  const [targetError, setTargetError] = useState("")
  const [statusMessage, setStatusMessage] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const existingPotNames = useMemo(
    () => new Set(state.pots.map((pot) => pot.name.trim().toLowerCase())),
    [state.pots],
  )
  const usedThemeColors = useMemo(
    () => new Set(state.pots.map((pot) => pot.theme_color.toLowerCase())),
    [state.pots],
  )
  const charactersLeft = maxPotNameLength - name.length

  const resetForm = () => {
    setName("")
    setTarget("")
    setThemeColor(themeOptions[0].value)
    setNameError("")
    setTargetError("")
    setStatusMessage("")
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)

    if (!nextOpen) {
      resetForm()
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatusMessage("")

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

    const result = await actions.addPot({
      id: crypto.randomUUID(),
      name: trimmedName,
      balance_cents: 0,
      target_cents,
      theme_color: themeColor,
    })

    setIsSaving(false)

    if (!result.ok) {
      setStatusMessage(result.message)
      return
    }

    setOpen(false)
    resetForm()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>Add Pot</Button>
      </DialogTrigger>
      <DialogContent variant="finance" showCloseButton={false}>
        <DialogHeader className="pr-12 text-left">
          <DialogTitle variant="finance">Add New Pot</DialogTitle>
          <DialogDescription variant="finance">
            Create a pot to set savings targets. These can help keep you on
            track as you save for special purchases.
          </DialogDescription>
        </DialogHeader>

        <DialogCloseButton aria-label="Close add pot dialog" />

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label
              htmlFor="pot-name"
              className="text-muted-foreground text-xs font-bold"
            >
              Pot Name
            </Label>
            <Input
              id="pot-name"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                setNameError("")
              }}
              maxLength={maxPotNameLength}
              placeholder="e.g. Rainy Days"
              aria-invalid={nameError ? "true" : "false"}
              aria-describedby={
                nameError ? "pot-name-error" : "pot-name-characters"
              }
            />
            <div className="flex justify-end">
              {nameError ? (
                <p id="pot-name-error" className="text-destructive text-xs">
                  {nameError}
                </p>
              ) : (
                <p
                  id="pot-name-characters"
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
              htmlFor="pot-target"
              className="text-muted-foreground text-xs font-bold"
            >
              Target
            </Label>
            <CurrencyInput
              id="pot-target"
              inputMode="decimal"
              value={target}
              onChange={(event) => {
                setTarget(event.target.value)
                setTargetError("")
              }}
              placeholder="e.g. 2000"
              aria-invalid={targetError ? "true" : "false"}
              aria-describedby={targetError ? "pot-target-error" : undefined}
            />
            {targetError && (
              <p id="pot-target-error" className="text-destructive text-xs">
                {targetError}
              </p>
            )}
          </div>

          <ThemeSelect
            id="pot-theme"
            value={themeColor}
            onValueChange={setThemeColor}
            usedThemeColors={usedThemeColors}
          />

          <Button type="submit" size="finance-submit" disabled={isSaving}>
            {isSaving ? "Saving..." : "Add Pot"}
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
