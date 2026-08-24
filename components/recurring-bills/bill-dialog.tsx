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
import { formatDollarInput } from "@/lib/finance/form-utils"
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

const billFormSchema = z.object({
  counterpartyId: requiredSelectSchema("Choose a contact."),
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
})

type BillFormValues = z.input<typeof billFormSchema>

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
        const payload: CreatableRecurringBillRecord = {
          id: bill?.id ?? crypto.randomUUID(),
          counterparty_id: value.counterpartyId,
          concept: value.concept,
          amount_cents: value.amount,
          currency: state.preferences.default_currency,
          frequency: value.frequency,
          first_due_date: value.firstDueDate,
          total_payments: value.totalPayments,
          credit_card_id:
            value.creditCardId === noCardValue ? null : value.creditCardId,
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
            settled automatically when the card statement is paid.
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
                    <Input
                      {...fieldProps}
                      type="date"
                      disabled={scheduleLocked}
                      value={field.state.value}
                      onChange={(event) =>
                        form.setValue("firstDueDate", event.target.value)
                      }
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
                onValueChange={(value) => form.setValue("creditCardId", value)}
                options={cardOptions}
                placeholder="Select a card"
                error={form.fieldErrors.creditCardId}
              />
            )}
          </form.form.Field>
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
