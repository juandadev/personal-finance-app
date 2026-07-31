"use client"

import { useMemo, useState, type ReactNode } from "react"
import { z } from "zod"

import AmericanExpressIcon from "@/components/icons/AmericanExpressIcon"
import MasterCardIcon from "@/components/icons/MasterCardIcon"
import VisaIcon from "@/components/icons/VisaIcon"
import { ThemeSelect } from "@/components/theme-select"
import { Button } from "@/components/ui/button"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Switch } from "@/components/ui/switch"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useFinance } from "@/hooks/use-finance"
import { splitAnnualityAmounts } from "@/lib/finance/credit-card-annuality"
import {
  formatDollarInput,
  parseDollarAmount,
  themeOptions,
} from "@/lib/finance/form-utils"
import type { CreditCardRecord, NewCreditCardRecord } from "@/lib/finance/types"
import { formatCurrency } from "@/lib/format"
import {
  currencyCentsSchema,
  requiredStringSchema,
  themeColorSchema,
} from "@/lib/forms/validation"
import { useStandardForm } from "@/lib/forms/use-standard-form"

const cardNetworkOptions = [
  { value: "Visa", label: "Visa", icon: VisaIcon },
  { value: "Master Card", label: "Master Card", icon: MasterCardIcon },
  {
    value: "American Express",
    label: "American Express",
    icon: AmericanExpressIcon,
  },
] as const
type CardNetwork = (typeof cardNetworkOptions)[number]["value"]

function toCardNetwork(value: string | null | undefined): CardNetwork {
  return cardNetworkOptions.some((network) => network.value === value)
    ? (value as CardNetwork)
    : "Visa"
}

const creditCardFormSchema = z
  .object({
    nickname: requiredStringSchema("Enter a card nickname.", 40),
    issuer: requiredStringSchema("Enter the issuer.", 40),
    network: z.enum(["Visa", "Master Card", "American Express"], {
      required_error: "Choose a card network.",
    }),
    lastFour: z.string().regex(/^\d{4}$/, "Enter exactly the last 4 digits."),
    expirationMonth: z.coerce.number().int().min(1).max(12),
    expirationYear: z.coerce
      .number()
      .int()
      .min(new Date().getFullYear())
      .max(2100),
    creditLimit: currencyCentsSchema("Enter a credit limit greater than $0."),
    closingDay: z.coerce.number().int().min(1).max(31),
    paymentDueDay: z.coerce.number().int().min(1).max(31),
    themeColor: themeColorSchema,
    annualityEnabled: z.boolean(),
    annualityAmount: z.string(),
    annualityAnniversaryMonth: z.coerce.number().int().min(1).max(12),
    annualityAnniversaryDay: z.coerce.number().int().min(1).max(31),
    annualityPaymentCount: z.coerce.number().int().min(1).max(12),
  })
  .superRefine((value, context) => {
    if (!value.annualityEnabled) {
      return
    }

    const amountCents = currencyCentsSchema(
      "Enter an annual fee greater than $0.",
    ).safeParse(value.annualityAmount)

    if (!amountCents.success) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["annualityAmount"],
        message:
          amountCents.error.issues[0]?.message ??
          "Enter an annual fee greater than $0.",
      })
    }
  })

type CreditCardFormValues = z.input<typeof creditCardFormSchema>

interface CreditCardDialogProps {
  creditCard?: CreditCardRecord
  trigger?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function AddCreditCardDialog() {
  return <CreditCardDialog trigger={<Button>Add Credit Card</Button>} />
}

export function EditCreditCardDialog({
  creditCard,
  trigger,
  open,
  onOpenChange,
}: {
  creditCard: CreditCardRecord
  trigger?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  return (
    <CreditCardDialog
      creditCard={creditCard}
      open={open}
      onOpenChange={onOpenChange}
      trigger={
        trigger ?? (
          <Button variant="ghost" size="sm">
            Edit
          </Button>
        )
      }
    />
  )
}

function CreditCardDialog({
  creditCard,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: CreditCardDialogProps) {
  const { actions, state } = useFinance()
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen
  const setOpen = (nextOpen: boolean) => {
    if (!isControlled) {
      setUncontrolledOpen(nextOpen)
    }

    onOpenChange?.(nextOpen)
  }
  const isEditing = Boolean(creditCard)
  const hasUnpaidStatement = creditCard
    ? state.creditCardStatements.some(
        (statement) =>
          statement.credit_card_id === creditCard.id &&
          statement.lifecycle_status !== "paid",
      )
    : false
  const defaultValues = useMemo<CreditCardFormValues>(
    () =>
      ({
        nickname: creditCard?.nickname ?? "",
        issuer: creditCard?.issuer ?? "",
        network: toCardNetwork(creditCard?.network),
        lastFour: creditCard?.last_four ?? "",
        expirationMonth:
          creditCard?.expiration_month ?? new Date().getMonth() + 1,
        expirationYear: creditCard?.expiration_year ?? new Date().getFullYear(),
        creditLimit: creditCard
          ? formatDollarInput(creditCard.credit_limit_cents / 100)
          : "",
        closingDay: creditCard?.closing_day_of_month ?? 30,
        paymentDueDay: creditCard?.payment_due_day_of_month ?? 15,
        themeColor: creditCard?.theme_color ?? themeOptions[0].value,
        annualityEnabled: creditCard?.annuality_enabled ?? false,
        annualityAmount: creditCard?.annuality_amount_cents
          ? formatDollarInput(creditCard.annuality_amount_cents / 100)
          : "",
        annualityAnniversaryMonth: creditCard?.annuality_anniversary_month ?? 1,
        annualityAnniversaryDay: creditCard?.annuality_anniversary_day ?? 1,
        annualityPaymentCount: creditCard?.annuality_payment_count ?? 1,
      }) satisfies CreditCardFormValues,
    [creditCard],
  )
  const form = useStandardForm<
    CreditCardFormValues,
    z.output<typeof creditCardFormSchema>
  >({
    defaultValues,
    schema: creditCardFormSchema,
    onSubmit: async ({ applyActionResult, resetForm, value }) => {
      const payload: NewCreditCardRecord = {
        id: creditCard?.id ?? crypto.randomUUID(),
        nickname: value.nickname,
        issuer: value.issuer,
        network: value.network,
        last_four: value.lastFour,
        expiration_month: value.expirationMonth,
        expiration_year: value.expirationYear,
        credit_limit_cents: value.creditLimit,
        closing_day_of_month: value.closingDay,
        payment_due_day_of_month: value.paymentDueDay,
        theme_color: value.themeColor,
        archived_at: creditCard?.archived_at ?? null,
        annuality_enabled: value.annualityEnabled,
        annuality_amount_cents: value.annualityEnabled
          ? (parseDollarAmount(String(value.annualityAmount)) ?? 0)
          : null,
        annuality_anniversary_month: value.annualityEnabled
          ? value.annualityAnniversaryMonth
          : null,
        annuality_anniversary_day: value.annualityEnabled
          ? value.annualityAnniversaryDay
          : null,
        annuality_payment_count: value.annualityEnabled
          ? value.annualityPaymentCount
          : null,
      }
      const result = creditCard
        ? await actions.updateCreditCard(creditCard.id, payload)
        : await actions.addCreditCard(payload)

      if (!applyActionResult(result)) {
        return
      }

      setOpen(false)

      if (!creditCard) {
        resetForm(defaultValues)
      }
    },
  })

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)

    if (nextOpen) {
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
            {isEditing ? "Edit Credit Card" : "Add Credit Card"}
          </DialogTitle>
          <DialogDescription variant="finance">
            Store only safe card details for planning. Never enter full card
            numbers, CVV, PINs, or banking credentials.
          </DialogDescription>
        </DialogHeader>
        <DialogCloseButton aria-label="Close credit card dialog" />

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
                      ? "Saving..."
                      : isEditing
                        ? "Save Credit Card"
                        : "Add Credit Card"}
                  </Button>
                )}
              </form.form.Subscribe>
            </>
          }
        >
          <FormTextField
            form={form}
            name="nickname"
            id="card-nickname"
            label="Nickname"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormTextField
              form={form}
              name="issuer"
              id="card-issuer"
              label="Issuer"
            />
            <FormNetworkSelect form={form} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormTextField
              form={form}
              name="lastFour"
              id="card-last-four"
              label="Last 4 Digits"
              inputMode="numeric"
              maxLength={4}
            />
            <FormNumberField
              form={form}
              name="expirationMonth"
              id="card-expiration-month"
              label="Exp. Month"
            />
            <FormNumberField
              form={form}
              name="expirationYear"
              id="card-expiration-year"
              label="Exp. Year"
            />
          </div>
          <form.form.Field name="creditLimit">
            {(field) => (
              <FormField
                id="card-credit-limit"
                label="Credit Limit"
                error={form.fieldErrors.creditLimit}
              >
                {(fieldProps) => (
                  <CurrencyInput
                    {...fieldProps}
                    value={field.state.value}
                    onChange={(event) =>
                      form.setValue("creditLimit", event.target.value)
                    }
                    onBlur={field.handleBlur}
                    placeholder="e.g. 25000"
                  />
                )}
              </FormField>
            )}
          </form.form.Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormNumberField
              form={form}
              name="closingDay"
              id="card-closing-day"
              label="Billing Cycle End Day"
              disabled={hasUnpaidStatement}
            />
            <FormNumberField
              form={form}
              name="paymentDueDay"
              id="card-payment-due-day"
              label="Payment Due Day"
              disabled={hasUnpaidStatement}
            />
          </div>
          {hasUnpaidStatement ? (
            <FormStatusMessage>
              Finish, pay, or close this card&apos;s current statement before
              changing its billing cycle or payment due day. This keeps existing
              purchases and statement history from being recalculated.
            </FormStatusMessage>
          ) : null}
          <form.form.Field name="themeColor">
            {(field) => (
              <ThemeSelect
                id="card-theme-color"
                value={field.state.value}
                onValueChange={(value) => form.setValue("themeColor", value)}
              />
            )}
          </form.form.Field>
          <div className="border-border space-y-4 border-t pt-4">
            <form.form.Field name="annualityEnabled">
              {(field) => (
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Annuality</p>
                    <p className="text-muted-foreground text-xs">
                      Charge annual fee on this card
                    </p>
                  </div>
                  <Switch
                    id="card-annuality-enabled"
                    checked={Boolean(field.state.value)}
                    onCheckedChange={(checked) =>
                      form.setValue("annualityEnabled", checked)
                    }
                  />
                </div>
              )}
            </form.form.Field>
            <form.form.Subscribe
              selector={(state) => ({
                enabled: state.values.annualityEnabled,
                amount: state.values.annualityAmount,
                paymentCount: state.values.annualityPaymentCount,
              })}
            >
              {({ enabled, amount, paymentCount }) => {
                if (!enabled) {
                  return null
                }

                const amountCents = Number(
                  String(amount).trim().replaceAll(",", ""),
                )
                const parsedCents = Number.isFinite(amountCents)
                  ? Math.round(amountCents * 100)
                  : 0
                const count = Number(paymentCount) || 1
                const splits =
                  parsedCents > 0
                    ? splitAnnualityAmounts(parsedCents, count)
                    : []
                const preview =
                  splits.length === 1
                    ? `${formatCurrency(splits[0]! / 100, { forceDecimals: true })} once on the anniversary statement`
                    : splits.length > 1
                      ? `${formatCurrency(splits[0]! / 100, { forceDecimals: true })} × ${splits.length} consecutive statement cycles`
                      : null

                return (
                  <>
                    <form.form.Field name="annualityAmount">
                      {(field) => (
                        <FormField
                          id="card-annuality-amount"
                          label="Full annual amount"
                          error={form.fieldErrors.annualityAmount}
                        >
                          {(fieldProps) => (
                            <CurrencyInput
                              {...fieldProps}
                              value={String(field.state.value)}
                              onChange={(event) =>
                                form.setValue(
                                  "annualityAmount",
                                  event.target.value,
                                )
                              }
                              onBlur={field.handleBlur}
                              placeholder="e.g. 1200"
                            />
                          )}
                        </FormField>
                      )}
                    </form.form.Field>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <FormNumberField
                        form={form}
                        name="annualityAnniversaryMonth"
                        id="card-annuality-month"
                        label="Anniversary month"
                      />
                      <FormNumberField
                        form={form}
                        name="annualityAnniversaryDay"
                        id="card-annuality-day"
                        label="Anniversary day"
                      />
                      <FormNumberField
                        form={form}
                        name="annualityPaymentCount"
                        id="card-annuality-payments"
                        label="Payments"
                      />
                    </div>
                    {preview ? (
                      <p className="text-muted-foreground text-xs">{preview}</p>
                    ) : null}
                  </>
                )
              }}
            </form.form.Subscribe>
          </div>
        </DialogFinanceForm>
      </DialogContent>
    </Dialog>
  )
}

function FormTextField({
  form,
  id,
  inputMode,
  label,
  maxLength,
  name,
}: {
  form: ReturnType<
    typeof useStandardForm<
      CreditCardFormValues,
      z.output<typeof creditCardFormSchema>
    >
  >
  id: string
  inputMode?: "numeric"
  label: string
  maxLength?: number
  name: keyof CreditCardFormValues
}) {
  return (
    <form.form.Field name={name}>
      {(field) => (
        <FormField id={id} label={label} error={form.fieldErrors[name]}>
          {(fieldProps) => (
            <Input
              {...fieldProps}
              inputMode={inputMode}
              maxLength={maxLength}
              value={String(field.state.value)}
              onChange={(event) => form.setValue(name, event.target.value)}
              onBlur={field.handleBlur}
            />
          )}
        </FormField>
      )}
    </form.form.Field>
  )
}

function CardNetworkLabel({
  network,
}: {
  network: (typeof cardNetworkOptions)[number]
}) {
  const Icon = network.icon

  return (
    <span className="flex items-center gap-3">
      <Icon className="size-6" aria-hidden />
      <span>{network.label}</span>
    </span>
  )
}

function FormNetworkSelect({
  form,
}: {
  form: ReturnType<
    typeof useStandardForm<
      CreditCardFormValues,
      z.output<typeof creditCardFormSchema>
    >
  >
}) {
  return (
    <form.form.Field name="network">
      {(field) => {
        const selectedNetwork = cardNetworkOptions.find(
          (network) => network.value === field.state.value,
        )

        return (
          <FormField
            id="card-network"
            label="Network"
            error={form.fieldErrors.network}
          >
            {(fieldProps) => (
              <Select
                value={field.state.value}
                onValueChange={(value) =>
                  form.setValue("network", value as CardNetwork)
                }
              >
                <SelectTrigger {...fieldProps} variant="form">
                  <SelectValue placeholder="Select a network">
                    {selectedNetwork ? (
                      <CardNetworkLabel network={selectedNetwork} />
                    ) : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent matchTriggerWidth>
                  {cardNetworkOptions.map((network) => (
                    <SelectItem
                      key={network.value}
                      value={network.value}
                      variant="form"
                    >
                      <CardNetworkLabel network={network} />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>
        )
      }}
    </form.form.Field>
  )
}

function FormNumberField({
  disabled,
  form,
  id,
  label,
  name,
}: {
  disabled?: boolean
  form: ReturnType<
    typeof useStandardForm<
      CreditCardFormValues,
      z.output<typeof creditCardFormSchema>
    >
  >
  id: string
  label: string
  name: keyof CreditCardFormValues
}) {
  return (
    <form.form.Field name={name}>
      {(field) => (
        <FormField id={id} label={label} error={form.fieldErrors[name]}>
          {(fieldProps) => (
            <Input
              {...fieldProps}
              disabled={disabled}
              type="number"
              min={1}
              value={String(field.state.value)}
              onChange={(event) => form.setValue(name, event.target.value)}
              onBlur={field.handleBlur}
            />
          )}
        </FormField>
      )}
    </form.form.Field>
  )
}
