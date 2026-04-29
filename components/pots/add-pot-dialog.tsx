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
  DialogTrigger,
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
import { parseDollarAmount, themeOptions } from "@/lib/finance/form-utils"
import { cn } from "@/lib/utils"

const maxPotNameLength = 30

function createPotSlug(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function createUniquePotId(name: string, existingIds: Set<string>) {
  const slug = createPotSlug(name) || "new-pot"
  const baseId = `pot-${slug}`

  if (!existingIds.has(baseId)) {
    return baseId
  }

  let suffix = 2
  let nextId = `${baseId}-${suffix}`

  while (existingIds.has(nextId)) {
    suffix += 1
    nextId = `${baseId}-${suffix}`
  }

  return nextId
}

export function AddPotDialog() {
  const { state, actions } = useFinance()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [target, setTarget] = useState("")
  const [themeColor, setThemeColor] = useState<string>(themeOptions[0].value)
  const [nameError, setNameError] = useState("")
  const [targetError, setTargetError] = useState("")

  const existingPotIds = useMemo(
    () => new Set(state.pots.map((pot) => pot.id)),
    [state.pots],
  )
  const existingPotNames = useMemo(
    () => new Set(state.pots.map((pot) => pot.name.trim().toLowerCase())),
    [state.pots],
  )
  const usedThemeColors = useMemo(
    () =>
      new Set(state.pots.map((pot) => pot.themeColor.toLowerCase())),
    [state.pots],
  )
  const selectedTheme = themeOptions.find((theme) => theme.value === themeColor)
  const charactersLeft = maxPotNameLength - name.length

  const resetForm = () => {
    setName("")
    setTarget("")
    setThemeColor(themeOptions[0].value)
    setNameError("")
    setTargetError("")
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)

    if (!nextOpen) {
      resetForm()
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

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

    actions.addPot({
      id: createUniquePotId(trimmedName, existingPotIds),
      name: trimmedName,
      balanceCents: 0,
      targetCents,
      themeColor,
      sortOrder: Math.max(0, ...state.pots.map((pot) => pot.sortOrder)) + 1,
    })
    setOpen(false)
    resetForm()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="bg-sidebar text-sidebar-primary-foreground hover:bg-sidebar/90 focus-visible:ring-ring rounded-lg px-4 py-3 text-sm font-bold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          + Add New Pot
        </button>
      </DialogTrigger>
      <DialogContent
        className="bg-card max-w-140 gap-0 rounded-xl border-none p-8 shadow-xl sm:max-w-140"
        showCloseButton={false}
      >
        <DialogHeader className="pr-12 text-left">
          <DialogTitle className="text-[2rem] leading-tight font-bold tracking-[-0.02em]">
            Add New Pot
          </DialogTitle>
          <DialogDescription className="mt-5 text-sm leading-6">
            Create a pot to set savings targets. These can help keep you on
            track as you save for special purchases.
          </DialogDescription>
        </DialogHeader>

        <DialogClose asChild>
          <button
            type="button"
            aria-label="Close add pot dialog"
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute top-9 right-8 flex size-7 items-center justify-center rounded-full border border-current transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <X className="size-4" aria-hidden />
          </button>
        </DialogClose>

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
              className="h-11 rounded-lg border-[#98908B] px-5 text-sm"
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
            <div className="relative">
              <span
                aria-hidden
                className="text-muted-foreground absolute top-1/2 left-5 -translate-y-1/2 text-sm"
              >
                $
              </span>
              <Input
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
                className="h-11 rounded-lg border-[#98908B] pl-10 text-sm"
              />
            </div>
            {targetError && (
              <p id="pot-target-error" className="text-destructive text-xs">
                {targetError}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="pot-theme"
              className="text-muted-foreground text-xs font-bold"
            >
              Theme
            </Label>
            <Select value={themeColor} onValueChange={setThemeColor}>
              <SelectTrigger
                id="pot-theme"
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
            className="h-13.25 w-full rounded-lg text-sm font-bold"
          >
            Add Pot
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
