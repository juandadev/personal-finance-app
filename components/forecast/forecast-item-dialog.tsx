"use client"

import { useMemo, useRef, useState, type ReactNode } from "react"
import { z } from "zod"

import {
  createForecastItemSchema,
  getForecastItemPeriodOptions,
  getHorizonStartPeriod,
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
import { formatForecastPeriodLabel } from "@/lib/finance/forecast-period"
import { cn } from "@/lib/utils"

interface ForecastItemDialogProps {
  adjustment?: CashForecastAdjustmentRecord
  periods: string[]
  trigger?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function AddForecastItemDialog({ periods }: { periods: string[] }) {
  return (
    <ForecastItemDialog
      periods={periods}
      trigger={
        <Button aria-label="Add Forecast Item">
          <span className="sm:hidden">Add Item</span>
          <span className="hidden sm:inline">Add Forecast Item</span>
        </Button>
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
  const schema = useMemo(
    () => createForecastItemSchema(periods, retainedMonthlyStartPeriod),
    [periods, retainedMonthlyStartPeriod],
  )
  const defaultValues = useMemo<ForecastItemValues>(
    () => ({
      kind: adjustment?.kind ?? "additional_income",
      name: adjustment?.name ?? "",
      amount: adjustment
        ? formatDollarInput(adjustment.amount_cents / 100)
        : "",
      startPeriod:
        retainedMonthlyStartPeriod ??
        getHorizonStartPeriod(adjustment?.start_period ?? "", periods),
      repeatMonthly: adjustment?.recurrence === "monthly",
    }),
    [adjustment, periods, retainedMonthlyStartPeriod],
  )
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
        recurrence: value.repeatMonthly ? "monthly" : "once",
      }
      const result = adjustment
        ? await actions.updateCashForecastAdjustment(adjustment.id, {
            kind: payload.kind,
            name: payload.name,
            amount_cents: payload.amount_cents,
            start_period: payload.start_period,
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

        <form className="mt-6 space-y-5" onSubmit={form.handleSubmit}>
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
                      label="Month"
                      error={form.fieldErrors.startPeriod}
                    >
                      {(fieldProps) => (
                        <Select
                          value={field.state.value}
                          onValueChange={(value) =>
                            form.setValue("startPeriod", value)
                          }
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
                  onCheckedChange={(checked) => {
                    const repeatMonthly = checked === true

                    form.setValue("repeatMonthly", repeatMonthly)

                    if (!repeatMonthly) {
                      form.setValue(
                        "startPeriod",
                        getHorizonStartPeriod(
                          form.form.state.values.startPeriod,
                          periods,
                        ),
                      )
                    }
                  }}
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
                    Continue this amount in each rolling forecast month until
                    you edit or delete it.
                  </span>
                </span>
              </Label>
            )}
          </form.form.Field>

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
        </form>
      </DialogContent>
    </Dialog>
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
