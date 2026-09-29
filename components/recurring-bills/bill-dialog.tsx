"use client"

import { useMemo, useState, type ReactNode } from "react"
import { z } from "zod"

import { CategorySelectWithQuickCreate } from "@/components/category-select-with-quick-create"
import { ContactSelectWithQuickCreate } from "@/components/contact-select-with-quick-create"
import { CreditCardBadge } from "@/components/credit-cards/credit-card-badge"
import { Button } from "@/components/ui/button"
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
import { DatePicker } from "@/components/ui/date-picker"
import { FormField, FormStatusMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useFinance } from "@/hooks/use-finance"
import { formatDollarInput } from "@/lib/finance/form-utils"
import { getAccountOwnerContactId } from "@/lib/finance/pot-transactions"
import type { CreatableRecurringBillRecord } from "@/lib/finance/types"
import {
  currencyCentsSchema,
  requiredSelectSchema,
  requiredStringSchema,
} from "@/lib/forms/validation"
import { useStandardForm } from "@/lib/forms/use-standard-form"
import type { RecurringBill } from "@/lib/types"
import type { ThemeColor } from "@/lib/theme-colors"
import { getInitials } from "@/lib/utils"

const noCardValue = "none"

const billFormSchema = z
  .object({
    counterpartyId: z.string(),
    concept: requiredStringSchema("Enter a bill concept.", 80),
    amount: currencyCentsSchema("Enter an amount greater than $0."),
    frequency: z.enum(["monthly", "yearly", "one_time"]),
    firstDueDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid first due date."),
    totalPayments: z.string().transform((value, context) => {
      const trimmed = value.trim()

      if (!trimmed) {
        return null
      }

      const parsed = Number(trimmed)

      if (!Number.isInteger(parsed) || parsed <= 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter a whole number of payments, or leave empty.",
        })

        return z.NEVER
      }

      return parsed
    }),
    categoryId: requiredSelectSchema("Choose a category."),
    creditCardId: z.string(),
    potEnabled: z.boolean(),
    potId: z.string(),
  })
  .superRefine((value, context) => {
    if (isPlannedSave(value)) {
      if (!value.potId) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Choose a pot.",
          path: ["potId"],
        })
      }

      return
    }

    if (!value.counterpartyId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Choose a contact.",
        path: ["counterpartyId"],
      })
    }
  })

type BillFormValues = z.input<typeof billFormSchema>

function isPlannedSave(values: { potEnabled: boolean; creditCardId: string }) {
  return values.potEnabled && values.creditCardId === noCardValue
}

type SelectOption = {
  value: string
  label: string
  creditCardAvatar?: {
    nickname: string
    initials: string
    color: ThemeColor
  }
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

interface BillDialogProps {
  bill?: RecurringBill
  trigger?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function AddBillDialog() {
  return <BillDialog trigger={<Button>Add Bill</Button>} />
}

export function EditBillDialog({
  bill,
  trigger,
  open,
  onOpenChange,
}: {
  bill: RecurringBill
  trigger?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  return (
    <BillDialog
      bill={bill}
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

function BillDialog({
  bill,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: BillDialogProps) {
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
  const [deleteStatusMessage, setDeleteStatusMessage] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const isEditing = Boolean(bill)
  const scheduleLocked = Boolean(bill?.hasPayments)
  const defaultCategoryId =
    state.categories.find((category) => category.slug === "bills")?.id ??
    state.categories[0]?.id ??
    ""
  const generalCategoryId = state.categories.find(
    (category) => category.name.toLowerCase() === "general",
  )?.id
  const ownerContactId = getAccountOwnerContactId(state)
  const potOptions = useMemo<SelectOption[]>(
    () => state.pots.map((pot) => ({ value: pot.id, label: pot.name })),
    [state.pots],
  )
  const hasPots = potOptions.length > 0
  const defaultValues = useMemo<BillFormValues>(
    () =>
      ({
        counterpartyId:
          bill?.counterpartyId ?? state.counterparties[0]?.id ?? "",
        concept: bill?.concept ?? "",
        amount: bill ? formatDollarInput(bill.amount) : "",
        frequency: bill?.frequency ?? "monthly",
        firstDueDate: bill?.firstDueDate ?? todayIsoDate(),
        totalPayments: bill?.totalPayments ? String(bill.totalPayments) : "",
        categoryId: bill?.categoryId ?? defaultCategoryId,
        creditCardId: bill?.creditCardId ?? noCardValue,
        potEnabled: Boolean(bill?.potId),
        potId: bill?.potId ?? "",
      }) satisfies BillFormValues,
    [bill, defaultCategoryId, state.counterparties],
  )
  const cardOptions = useMemo<SelectOption[]>(
    () => [
      { value: noCardValue, label: "None - choose when paying" },
      ...state.creditCards
        .filter((card) => !card.archived_at)
        .map((card) => ({
          value: card.id,
          label: `${card.nickname} •••• ${card.last_four}`,
          creditCardAvatar: {
            nickname: card.nickname,
            initials: getInitials(card.nickname),
            color: card.theme_color,
          },
        })),
    ],
    [state.creditCards],
  )
  const form = useStandardForm<BillFormValues, z.output<typeof billFormSchema>>(
    {
      defaultValues,
      schema: billFormSchema,
      onSubmit: async ({ applyActionResult, resetForm, value }) => {
        const plannedSave = isPlannedSave(value)

        if (plannedSave && !ownerContactId) {
          applyActionResult({
            ok: false,
            message:
              "Your account owner contact is not ready yet. Refresh and try again.",
          })
          return
        }

        const payload: CreatableRecurringBillRecord = {
          id: bill?.id ?? crypto.randomUUID(),
          counterparty_id:
            plannedSave && ownerContactId
              ? ownerContactId
              : value.counterpartyId,
          concept: value.concept,
          amount_cents: value.amount,
          currency: state.preferences.default_currency,
          frequency: value.frequency,
          first_due_date: value.firstDueDate,
          total_payments: value.totalPayments,
          credit_card_id:
            value.creditCardId === noCardValue ? null : value.creditCardId,
          pot_id: plannedSave ? value.potId : null,
          category_id: value.categoryId,
        }
        const result = bill
          ? await actions.updateRecurringBill(bill.id, {
              counterparty_id: payload.counterparty_id,
              concept: payload.concept,
              amount_cents: payload.amount_cents,
              frequency: payload.frequency,
              first_due_date: payload.first_due_date,
              total_payments: payload.total_payments,
              credit_card_id: payload.credit_card_id,
              pot_id: payload.pot_id,
              category_id: payload.category_id,
            })
          : await actions.addRecurringBill(payload)

        if (!applyActionResult(result)) {
          return
        }

        setOpen(false)

        if (!bill) {
          resetForm(defaultValues)
        }
      },
    },
  )

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)

    if (nextOpen) {
      form.reset(defaultValues)
      setDeleteStatusMessage("")
    }
  }

  const handleCreditCardChange = (value: string) => {
    form.setValue("creditCardId", value)

    if (value !== noCardValue) {
      form.setValue("potEnabled", false)
      form.setValue("potId", "")
    }
  }

  const handlePlannedSaveChange = (checked: boolean) => {
    const { categoryId, counterpartyId } = form.form.state.values

    form.setValue("potEnabled", checked)

    if (checked) {
      if (categoryId === defaultCategoryId && generalCategoryId) {
        form.setValue("categoryId", generalCategoryId)
      }

      return
    }

    form.setValue("potId", "")

    if (counterpartyId === ownerContactId) {
      form.setValue("counterpartyId", "")
    }
  }

  const handleDelete = async () => {
    if (!bill) {
      return
    }

    setIsDeleting(true)
    setDeleteStatusMessage("")

    const result = await actions.deleteRecurringBill(bill.id)

    setIsDeleting(false)

    if (!result.ok) {
      setDeleteStatusMessage(result.message)
      return
    }

    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && !isControlled ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : null}
      <DialogContent variant="finance" showCloseButton={false}>
        <DialogHeader className="text-left">
          <DialogTitle variant="finance">
            {isEditing ? "Edit Recurring Bill" : "Add Recurring Bill"}
          </DialogTitle>
          <DialogDescription variant="finance">
            Schedule a recurring payment. Bills assigned to a credit card are
            settled automatically when the card statement is paid. Bills saved
            to a pot move money from your bank account into that pot.
          </DialogDescription>
        </DialogHeader>
        <DialogCloseButton aria-label="Close recurring bill dialog" />

        <DialogFinanceForm
          onSubmit={form.handleSubmit}
          actions={
            <>
              {form.status?.message ? (
                <FormStatusMessage variant={form.status.variant}>
                  {form.status.message}
                </FormStatusMessage>
              ) : null}

              <form.form.Subscribe
                selector={(formState) => formState.isSubmitting}
              >
                {(isSubmitting) => (
                  <Button
                    type="submit"
                    size="finance-submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting
                      ? "Saving..."
                      : isEditing
                        ? "Save Recurring Bill"
                        : "Add Recurring Bill"}
                  </Button>
                )}
              </form.form.Subscribe>

              {bill && !bill.hasPayments ? (
                <>
                  <Button
                    type="button"
                    variant="destructive"
                    size="finance-submit"
                    disabled={isDeleting}
                    onClick={handleDelete}
                  >
                    {isDeleting ? "Deleting..." : "Delete Recurring Bill"}
                  </Button>
                  {deleteStatusMessage ? (
                    <FormStatusMessage variant="error">
                      {deleteStatusMessage}
                    </FormStatusMessage>
                  ) : null}
                </>
              ) : null}
            </>
          }
        >
          <form.form.Subscribe
            selector={(formState) => isPlannedSave(formState.values)}
          >
            {(plannedSave) =>
              plannedSave ? null : (
                <form.form.Field name="counterpartyId">
                  {(field) => (
                    <ContactSelectWithQuickCreate
                      key={open ? "bill-contact-open" : "bill-contact-closed"}
                      id="bill-contact"
                      value={field.state.value}
                      onValueChange={(value) =>
                        form.setValue("counterpartyId", value)
                      }
                      error={form.fieldErrors.counterpartyId}
                    />
                  )}
                </form.form.Field>
              )
            }
          </form.form.Subscribe>

          <form.form.Field name="concept">
            {(field) => (
              <FormField
                id="bill-concept"
                label="Concept"
                error={form.fieldErrors.concept}
              >
                {(fieldProps) => (
                  <Input
                    {...fieldProps}
                    value={field.state.value}
                    onChange={(event) =>
                      form.setValue("concept", event.target.value)
                    }
                    onBlur={field.handleBlur}
                    placeholder="e.g. Internet service"
                  />
                )}
              </FormField>
            )}
          </form.form.Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <form.form.Field name="amount">
              {(field) => (
                <FormField
                  id="bill-amount"
                  label="Amount"
                  error={form.fieldErrors.amount}
                >
                  {(fieldProps) => (
                    <CurrencyInput
                      {...fieldProps}
                      inputMode="decimal"
                      value={field.state.value}
                      onChange={(event) =>
                        form.setValue("amount", event.target.value)
                      }
                      onBlur={field.handleBlur}
                      placeholder="e.g. 15.99"
                    />
                  )}
                </FormField>
              )}
            </form.form.Field>
            <form.form.Field name="categoryId">
              {(field) => (
                <CategorySelectWithQuickCreate
                  key={open ? "bill-category-open" : "bill-category-closed"}
                  id="bill-category"
                  value={field.state.value}
                  onValueChange={(value) => form.setValue("categoryId", value)}
                  error={form.fieldErrors.categoryId}
                />
              )}
            </form.form.Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <form.form.Field name="frequency">
              {(field) => (
                <BillFormSelect
                  id="bill-frequency"
                  label="Frequency"
                  value={field.state.value}
                  onValueChange={(value) =>
                    form.setValue(
                      "frequency",
                      value as "monthly" | "yearly" | "one_time",
                    )
                  }
                  options={[
                    { value: "monthly", label: "Monthly" },
                    { value: "yearly", label: "Yearly" },
                    { value: "one_time", label: "One-Time" },
                  ]}
                  disabled={scheduleLocked}
                  error={form.fieldErrors.frequency}
                />
              )}
            </form.form.Field>
            <form.form.Field name="firstDueDate">
              {(field) => (
                <FormField
                  id="bill-first-due-date"
                  label="First Due Date"
                  error={form.fieldErrors.firstDueDate}
                >
                  {(fieldProps) => (
                    <DatePicker
                      {...fieldProps}
                      disabled={scheduleLocked}
                      value={field.state.value}
                      onChange={(nextDate) => {
                        if (nextDate) {
                          form.setValue("firstDueDate", nextDate)
                        }
                      }}
                      onBlur={field.handleBlur}
                    />
                  )}
                </FormField>
              )}
            </form.form.Field>
          </div>
          {scheduleLocked ? (
            <FormStatusMessage>
              This bill already has payments, so its frequency and first due
              date are locked. Archive it and create a new bill to reschedule.
            </FormStatusMessage>
          ) : null}

          <form.form.Field name="totalPayments">
            {(field) => (
              <FormField
                id="bill-total-payments"
                label="Number of Payments"
                error={form.fieldErrors.totalPayments}
              >
                {(fieldProps) => (
                  <Input
                    {...fieldProps}
                    type="number"
                    min={1}
                    value={field.state.value}
                    onChange={(event) =>
                      form.setValue("totalPayments", event.target.value)
                    }
                    onBlur={field.handleBlur}
                    placeholder="Leave empty for until canceled"
                  />
                )}
              </FormField>
            )}
          </form.form.Field>

          <form.form.Field name="creditCardId">
            {(field) => (
              <BillFormSelect
                id="bill-credit-card"
                label="Charges To"
                value={field.state.value}
                onValueChange={handleCreditCardChange}
                options={cardOptions}
                placeholder="Select a card"
                error={form.fieldErrors.creditCardId}
              />
            )}
          </form.form.Field>

          <form.form.Subscribe
            selector={(formState) => ({
              creditCardId: formState.values.creditCardId,
              potEnabled: formState.values.potEnabled,
            })}
          >
            {({ creditCardId, potEnabled }) =>
              creditCardId === noCardValue ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <Label
                        htmlFor="bill-planned-save"
                        className="text-sm font-medium"
                      >
                        Save to a pot
                      </Label>
                      <p
                        id="bill-planned-save-helper"
                        className="text-muted-foreground text-xs"
                      >
                        {hasPots
                          ? "Paying moves this amount from your bank account into the pot."
                          : "Create a pot first."}
                      </p>
                    </div>
                    <Switch
                      id="bill-planned-save"
                      aria-describedby="bill-planned-save-helper"
                      checked={potEnabled}
                      disabled={!hasPots && !potEnabled}
                      onCheckedChange={handlePlannedSaveChange}
                    />
                  </div>
                  {potEnabled ? (
                    <form.form.Field name="potId">
                      {(field) => (
                        <BillFormSelect
                          id="bill-pot"
                          label="Pot"
                          value={field.state.value}
                          onValueChange={(value) =>
                            form.setValue("potId", value)
                          }
                          options={potOptions}
                          placeholder="Select a pot"
                          error={form.fieldErrors.potId}
                        />
                      )}
                    </form.form.Field>
                  ) : null}
                </div>
              ) : null
            }
          </form.form.Subscribe>
        </DialogFinanceForm>
      </DialogContent>
    </Dialog>
  )
}

function SelectOptionLabel({ option }: { option: SelectOption }) {
  if (option.creditCardAvatar) {
    return (
      <span className="flex items-center gap-3">
        <CreditCardBadge
          className="size-8 rounded-lg text-[10px]"
          nickname={option.creditCardAvatar.nickname}
          initials={option.creditCardAvatar.initials}
          color={option.creditCardAvatar.color}
        />
        <span>{option.label}</span>
      </span>
    )
  }

  return option.label
}

function BillFormSelect({
  disabled,
  error,
  id,
  label,
  onValueChange,
  options,
  placeholder = "Select an option",
  value,
}: {
  disabled?: boolean
  error?: string
  id: string
  label: string
  onValueChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  value: string
}) {
  const selectedOption = options.find((option) => option.value === value)

  return (
    <FormField id={id} label={label} error={error}>
      {(fieldProps) => (
        <Select value={value} onValueChange={onValueChange} disabled={disabled}>
          <SelectTrigger {...fieldProps} variant="form">
            <SelectValue placeholder={placeholder}>
              {selectedOption ? (
                <SelectOptionLabel option={selectedOption} />
              ) : null}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-107.5" matchTriggerWidth>
            {options.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                variant="form"
              >
                <SelectOptionLabel option={option} />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </FormField>
  )
}
