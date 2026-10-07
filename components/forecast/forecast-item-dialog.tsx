"use client"

import { useMemo, useRef, useState, type ReactNode } from "react"
import { z } from "zod"

import {
  createForecastItemSchema,
  getForecastEndMonthLabel,
  getForecastEndPeriodOptions,
  getForecastItemEndDefaults,
  getForecastItemPeriodOptions,
  getHorizonStartPeriod,
  getRemainingMonthsLabel,
  getResolvedForecastEndPeriod,
  isValidRemainingMonths,
  reconcileForecastEndWithStart,
  type ForecastEndChoice,
  type ForecastItemValues,
} from "@/components/forecast/forecast-ui-state"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { CurrencyInput } from "@/components/ui/currency-input"
import {
  Dialog,
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogFinanceForm,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { FormField, FormStatusMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useFinance } from "@/hooks/use-finance"
import { formatDollarInput } from "@/lib/finance/form-utils"
import type {
  CashForecastAdjustmentKind,
  CashForecastAdjustmentRecord,
  NewCashForecastAdjustmentRecord,
} from "@/lib/finance/types"
import { useStandardForm } from "@/lib/forms/use-standard-form"
import {
  formatForecastPeriodLabel,
  getForecastCountingStart,
  getForecastEndPeriod,
  getInclusiveForecastMonthCount,
} from "@/lib/finance/forecast-period"
import { cn } from "@/lib/utils"

interface ForecastItemDialogProps {
  adjustment?: CashForecastAdjustmentRecord
  periods: string[]
  trigger?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function AddForecastItemDialog({
  periods,
  trigger,
  open,
  onOpenChange,
}: {
  periods: string[]
  trigger?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  return (
    <ForecastItemDialog
      periods={periods}
      open={open}
      onOpenChange={onOpenChange}
      trigger={
        trigger ??
        (open === undefined ? (
          <Button aria-label="Add Forecast Item">
            <span className="sm:hidden">Add Item</span>
            <span className="hidden sm:inline">Add Forecast Item</span>
          </Button>
        ) : undefined)
      }
    />
  )
}

export function EditForecastItemDialog({
  adjustment,
  periods,
  open,
  onOpenChange,
}: {
  adjustment: CashForecastAdjustmentRecord
  periods: string[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <ForecastItemDialog
      adjustment={adjustment}
      periods={periods}
      open={open}
      onOpenChange={onOpenChange}
    />
  )
}

function ForecastItemDialog({
  adjustment,
  periods,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: ForecastItemDialogProps) {
  const { actions } = useFinance()
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen
  const isEditing = Boolean(adjustment)
  const createIdRef = useRef<string | null>(null)
  const retainedMonthlyStartPeriod =
    adjustment?.recurrence === "monthly" &&
    !periods.includes(adjustment.start_period)
      ? adjustment.start_period
      : undefined
  const currentPeriod = periods[0] ?? ""
  const schema = useMemo(
    () => createForecastItemSchema(periods, retainedMonthlyStartPeriod),
    [periods, retainedMonthlyStartPeriod],
  )
  const defaultValues = useMemo<ForecastItemValues>(() => {
    const startPeriod =
      retainedMonthlyStartPeriod ??
      getHorizonStartPeriod(adjustment?.start_period ?? "", periods)
    const repeatMonthly = adjustment?.recurrence === "monthly"

    return {
      kind: adjustment?.kind ?? "additional_income",
      name: adjustment?.name ?? "",
      amount: adjustment
        ? formatDollarInput(adjustment.amount_cents / 100)
        : "",
      startPeriod,
      repeatMonthly,
      ...getForecastItemEndDefaults({
        recurrence: repeatMonthly ? "monthly" : "once",
        startPeriod,
        endPeriod: adjustment?.end_period ?? null,
        periods,
      }),
    }
  }, [adjustment, periods, retainedMonthlyStartPeriod])
  const form = useStandardForm<ForecastItemValues, z.output<typeof schema>>({
    defaultValues,
    schema,
    onSubmit: async ({ applyActionResult, resetForm, value }) => {
      const recordId =
        adjustment?.id ?? createIdRef.current ?? crypto.randomUUID()

      if (!adjustment) {
        createIdRef.current = recordId
      }

      const payload: NewCashForecastAdjustmentRecord = {
        id: recordId,
        kind: value.kind,
        name: value.name,
        amount_cents: value.amount,
        start_period: value.startPeriod,
        end_period: getResolvedForecastEndPeriod({
          repeatMonthly: value.repeatMonthly,
          endChoice: value.endChoice,
          endPeriod: value.endPeriod,
          remainingMonths: value.remainingMonths,
          startPeriod: value.startPeriod,
          currentPeriod,
        }),
        recurrence: value.repeatMonthly ? "monthly" : "once",
      }
      const result = adjustment
        ? await actions.updateCashForecastAdjustment(adjustment.id, {
            kind: payload.kind,
            name: payload.name,
            amount_cents: payload.amount_cents,
            start_period: payload.start_period,
            end_period: payload.end_period,
            recurrence: payload.recurrence,
          })
        : await actions.addCashForecastAdjustment(payload)

      if (!applyActionResult(result)) {
        return
      }

      createIdRef.current = null
      setOpen(false)

      if (!adjustment) {
        resetForm(defaultValues)
      }
    },
  })

  function setOpen(nextOpen: boolean) {
    if (!isControlled) {
      setUncontrolledOpen(nextOpen)
    }

    onOpenChange?.(nextOpen)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)

    if (nextOpen) {
      createIdRef.current = null
      form.reset(defaultValues)
    }
  }

  function syncEnd(
    startPeriod: string,
    endChoice = form.form.state.values.endChoice,
  ) {
    const values = form.form.state.values
    const nextEnd = reconcileForecastEndWithStart({
      startPeriod,
      currentPeriod,
      endChoice,
      endPeriod: values.endPeriod,
      remainingMonths: values.remainingMonths,
    })

    form.setValue("endPeriod", nextEnd.endPeriod)
    form.setValue("remainingMonths", nextEnd.remainingMonths)
  }

  function handleStartPeriod(startPeriod: string) {
    form.setValue("startPeriod", startPeriod)

    if (form.form.state.values.repeatMonthly) {
      syncEnd(startPeriod)
    }
  }

  function handleRepeatChange(checked: boolean | "indeterminate") {
    const repeatMonthly = checked === true
    const nextStart = repeatMonthly
      ? form.form.state.values.startPeriod
      : getHorizonStartPeriod(form.form.state.values.startPeriod, periods)

    form.setValue("repeatMonthly", repeatMonthly)
    form.setValue("startPeriod", nextStart)

    if (repeatMonthly) {
      syncEnd(nextStart)
    }
  }

  function handleEndChoice(endChoice: ForecastEndChoice) {
    form.setValue("endChoice", endChoice)

    if (endChoice === "none") {
      form.setValue("endPeriod", "")
      form.setValue("remainingMonths", "")
      return
    }

    syncEnd(form.form.state.values.startPeriod, endChoice)
  }

  function handleEndPeriod(endPeriod: string) {
    const countingStart = getForecastCountingStart(
      form.form.state.values.startPeriod,
      currentPeriod,
    )

    form.setValue("endPeriod", endPeriod)
    form.setValue(
      "remainingMonths",
      String(getInclusiveForecastMonthCount(countingStart, endPeriod)),
    )
  }

  function handleRemainingMonths(rawValue: string) {
    const remainingMonths = rawValue.replace(/\D/g, "").slice(0, 3)

    form.setValue("remainingMonths", remainingMonths)

    if (!isValidRemainingMonths(remainingMonths)) {
      form.setValue("endPeriod", "")
      return
    }

    form.setValue(
      "endPeriod",
      getForecastEndPeriod(
        getForecastCountingStart(
          form.form.state.values.startPeriod,
          currentPeriod,
        ),
        Number(remainingMonths),
      ),
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && !isControlled ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : null}
      <DialogContent variant="finance" showCloseButton={false}>
        <DialogHeader className="text-left">
          <DialogTitle variant="finance">
            {isEditing ? "Edit Forecast Item" : "Add Forecast Item"}
          </DialogTitle>
          <DialogDescription variant="finance">
            Add income or an outflow to your projection without changing any
            account balance or transaction.
          </DialogDescription>
        </DialogHeader>
        <DialogCloseButton aria-label="Close forecast item dialog" />

        <DialogFinanceForm
          onSubmit={form.handleSubmit}
          actions={
            <>
              {form.status?.message ? (
                <FormStatusMessage variant={form.status.variant}>
                  {form.status.message}
                </FormStatusMessage>
              ) : null}

              <form.form.Subscribe selector={(state) => state.isSubmitting}>
                {(isSubmitting) => (
                  <Button
                    type="submit"
                    size="finance-submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting
                      ? "Saving forecast item..."
                      : isEditing
                        ? "Save Changes"
                        : "Add Forecast Item"}
                  </Button>
                )}
              </form.form.Subscribe>
            </>
          }
        >
          <form.form.Field name="kind">
            {(field) => (
              <fieldset className="space-y-2">
                <legend className="text-muted-foreground text-xs font-bold">
                  Item Type
                </legend>
                <RadioGroup
                  className="grid gap-3 sm:grid-cols-2"
                  value={field.state.value}
                  onValueChange={(value: CashForecastAdjustmentKind) => {
                    form.setValue("kind", value)
                  }}
                >
                  <ForecastKindOption
                    id="forecast-kind-income"
                    value="additional_income"
                    label="Additional Income"
                    description="One-time or monthly"
                    selected={field.state.value === "additional_income"}
                  />
                  <ForecastKindOption
                    id="forecast-kind-outflow"
                    value="planned_outflow"
                    label="Planned Outflow"
                    description="One-time or monthly"
                    selected={field.state.value === "planned_outflow"}
                  />
                </RadioGroup>
              </fieldset>
            )}
          </form.form.Field>

          <form.form.Field name="name">
            {(field) => (
              <FormField
                id="forecast-item-name"
                label="Name"
                error={form.fieldErrors.name}
              >
                {(fieldProps) => (
                  <Input
                    {...fieldProps}
                    className="h-11 rounded-lg px-5 text-base sm:text-sm"
                    value={field.state.value}
                    onChange={(event) =>
                      form.setValue("name", event.target.value)
                    }
                    onBlur={field.handleBlur}
                    placeholder="e.g. Annual insurance"
                  />
                )}
              </FormField>
            )}
          </form.form.Field>

          <form.form.Field name="amount">
            {(field) => (
              <FormField
                id="forecast-item-amount"
                label="Amount"
                error={form.fieldErrors.amount}
              >
                {(fieldProps) => (
                  <CurrencyInput
                    {...fieldProps}
                    className="text-base sm:text-sm"
                    value={field.state.value}
                    onChange={(event) =>
                      form.setValue("amount", event.target.value)
                    }
                    onBlur={field.handleBlur}
                    placeholder="e.g. 1200"
                  />
                )}
              </FormField>
            )}
          </form.form.Field>

          <form.form.Subscribe selector={(state) => state.values.repeatMonthly}>
            {(repeatMonthly) => {
              const availablePeriods = getForecastItemPeriodOptions({
                periods,
                repeatMonthly,
                retainedMonthlyStartPeriod,
              })

              return (
                <form.form.Field name="startPeriod">
                  {(field) => (
                    <FormField
                      id="forecast-item-period"
                      label={repeatMonthly ? "Start month" : "Month"}
                      error={form.fieldErrors.startPeriod}
                    >
                      {(fieldProps) => (
                        <Select
                          value={field.state.value}
                          onValueChange={handleStartPeriod}
                        >
                          <SelectTrigger {...fieldProps} variant="form">
                            <SelectValue placeholder="Choose a month" />
                          </SelectTrigger>
                          <SelectContent matchTriggerWidth>
                            {availablePeriods.map((period) => (
                              <SelectItem
                                key={period}
                                value={period}
                                variant="form"
                              >
                                {formatForecastPeriodLabel(period)}
                                {!periods.includes(period)
                                  ? " · Already active"
                                  : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </FormField>
                  )}
                </form.form.Field>
              )
            }}
          </form.form.Subscribe>

          <form.form.Field name="repeatMonthly">
            {(field) => (
              <Label
                htmlFor="forecast-item-repeat"
                className="bg-background flex min-h-11 cursor-pointer items-start gap-3 rounded-lg p-4"
              >
                <Checkbox
                  id="forecast-item-repeat"
                  checked={field.state.value}
                  onCheckedChange={handleRepeatChange}
                  aria-describedby="forecast-item-repeat-helper"
                />
                <span className="space-y-1">
                  <span className="text-foreground block text-sm font-bold">
                    Repeat Every Month
                  </span>
                  <span
                    id="forecast-item-repeat-helper"
                    className="text-muted-foreground block text-xs leading-normal font-normal"
                  >
                    Include this amount in every forecast month from the start
                    month.
                  </span>
                </span>
              </Label>
            )}
          </form.form.Field>

          <form.form.Subscribe
            selector={(state) => ({
              repeatMonthly: state.values.repeatMonthly,
              endChoice: state.values.endChoice,
              endPeriod: state.values.endPeriod,
              remainingMonths: state.values.remainingMonths,
              startPeriod: state.values.startPeriod,
            })}
          >
            {({
              repeatMonthly,
              endChoice,
              endPeriod,
              remainingMonths,
              startPeriod,
            }) => {
              if (!repeatMonthly) {
                return null
              }

              const countingStart = getForecastCountingStart(
                startPeriod,
                currentPeriod,
              )
              const endPeriodOptions = getForecastEndPeriodOptions(
                periods,
                countingStart,
              )
              const selectedEndPeriod = endPeriodOptions.includes(endPeriod)
                ? endPeriod
                : ""
              const remainingCount = isValidRemainingMonths(remainingMonths)
                ? Number(remainingMonths)
                : null
              const monthHelper =
                endChoice === "month" && selectedEndPeriod
                  ? getRemainingMonthsLabel(
                      getInclusiveForecastMonthCount(
                        countingStart,
                        selectedEndPeriod,
                      ),
                    )
                  : undefined
              const countHelper =
                endChoice === "count" && remainingCount
                  ? getForecastEndMonthLabel(
                      getForecastEndPeriod(countingStart, remainingCount),
                    )
                  : undefined

              return (
                <fieldset className="space-y-3">
                  <legend className="sr-only">How long it continues</legend>
                  <RadioGroup
                    className="grid gap-3"
                    value={endChoice}
                    onValueChange={(value: ForecastEndChoice) =>
                      handleEndChoice(value)
                    }
                  >
                    <ForecastEndOption
                      id="forecast-end-none"
                      value="none"
                      label="No end month"
                      description="Continues until you edit or delete it."
                      selected={endChoice === "none"}
                    />
                    <ForecastEndOption
                      id="forecast-end-month"
                      value="month"
                      label="End in a month"
                      selected={endChoice === "month"}
                    >
                      <FormField
                        id="forecast-item-end-period"
                        label="End month"
                        error={form.fieldErrors.endPeriod}
                        helperText={monthHelper}
                      >
                        {(fieldProps) => (
                          <Select
                            key={selectedEndPeriod || "unset"}
                            value={selectedEndPeriod || undefined}
                            onValueChange={handleEndPeriod}
                          >
                            <SelectTrigger {...fieldProps} variant="form">
                              <SelectValue placeholder="Choose a month" />
                            </SelectTrigger>
                            <SelectContent matchTriggerWidth>
                              {endPeriodOptions.map((period) => (
                                <SelectItem
                                  key={period}
                                  value={period}
                                  variant="form"
                                >
                                  {formatForecastPeriodLabel(period)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </FormField>
                    </ForecastEndOption>
                    <ForecastEndOption
                      id="forecast-end-count"
                      value="count"
                      label="End after a number of months"
                      selected={endChoice === "count"}
                    >
                      <FormField
                        id="forecast-item-remaining-months"
                        label="Remaining months"
                        error={form.fieldErrors.remainingMonths}
                        helperText={countHelper}
                      >
                        {(fieldProps) => (
                          <Input
                            {...fieldProps}
                            className="h-11 rounded-lg px-5 text-base sm:text-sm"
                            inputMode="numeric"
                            value={remainingMonths}
                            onChange={(event) =>
                              handleRemainingMonths(event.target.value)
                            }
                            placeholder="e.g. 6"
                          />
                        )}
                      </FormField>
                    </ForecastEndOption>
                  </RadioGroup>
                </fieldset>
              )
            }}
          </form.form.Subscribe>
        </DialogFinanceForm>
      </DialogContent>
    </Dialog>
  )
}

function ForecastEndOption({
  id,
  value,
  label,
  description,
  selected,
  children,
}: {
  id: string
  value: ForecastEndChoice
  label: string
  description?: string
  selected: boolean
  children?: ReactNode
}) {
  return (
    <div
      className={cn(
        "border-input hover:border-ring rounded-lg border p-4 transition-colors",
        selected && "border-ring ring-ring/20 ring-2",
      )}
    >
      <Label htmlFor={id} className="flex cursor-pointer items-start gap-3">
        <RadioGroupItem id={id} value={value} className="mt-0.5" />
        <span className="space-y-0.5">
          <span className="text-foreground block text-sm font-bold">
            {label}
          </span>
          {description ? (
            <span className="text-muted-foreground block text-xs font-normal">
              {description}
            </span>
          ) : null}
        </span>
      </Label>
      {selected && children ? (
        <div className="mt-3 pl-7">{children}</div>
      ) : null}
    </div>
  )
}

function ForecastKindOption({
  id,
  value,
  label,
  description,
  selected,
}: {
  id: string
  value: CashForecastAdjustmentKind
  label: string
  description: string
  selected: boolean
}) {
  return (
    <Label
      htmlFor={id}
      className={cn(
        "border-input hover:border-ring flex min-h-18 cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors",
        selected && "border-ring ring-ring/20 ring-2",
      )}
    >
      <RadioGroupItem id={id} value={value} />
      <span className="space-y-0.5">
        <span className="text-foreground block text-sm font-bold">{label}</span>
        <span className="text-muted-foreground block text-xs font-normal">
          {description}
        </span>
      </span>
    </Label>
  )
}
