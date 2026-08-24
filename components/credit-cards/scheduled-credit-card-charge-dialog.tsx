"use client"

import { useMemo, useState, type ReactNode } from "react"
import { z } from "zod"

import { CategorySelectWithQuickCreate } from "@/components/category-select-with-quick-create"
import { ContactSelectWithQuickCreate } from "@/components/contact-select-with-quick-create"
import { CreditCardBadge } from "@/components/credit-cards/credit-card-badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
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
import { useFinance } from "@/hooks/use-finance"
import { getForecastLocalDate } from "@/lib/finance/forecast-period"
import { formatDollarInput } from "@/lib/finance/form-utils"
import type { CreatableRecurringBillRecord } from "@/lib/finance/types"
import {
  currencyCentsSchema,
  requiredSelectSchema,
  requiredStringSchema,
} from "@/lib/forms/validation"
import { useStandardForm } from "@/lib/forms/use-standard-form"
import type { CreditCard, RecurringBill } from "@/lib/types"

const chargeDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid charge date.")

const scheduledChargeFormSchema = z.object({
  counterpartyId: requiredSelectSchema("Choose a contact."),
  concept: requiredStringSchema("Enter a charge concept.", 80),
  amount: currencyCentsSchema("Enter an amount greater than $0."),
  chargeDate: chargeDateSchema,
  categoryId: requiredSelectSchema("Choose a category."),
})

type ScheduledChargeFormValues = z.input<typeof scheduledChargeFormSchema>

interface ScheduledCreditCardChargeDialogProps {
  creditCard: CreditCard
  bill?: RecurringBill
  trigger?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function AddScheduledCreditCardChargeDialog({
  creditCard,
  trigger,
  open,
  onOpenChange,
}: Pick<
  ScheduledCreditCardChargeDialogProps,
  "creditCard" | "trigger" | "open" | "onOpenChange"
>) {
  return (
    <ScheduledCreditCardChargeDialog
      creditCard={creditCard}
      trigger={trigger}
      open={open}
      onOpenChange={onOpenChange}
    />
  )
}

export function EditScheduledCreditCardChargeDialog({
  bill,
  creditCard,
  trigger,
  open,
  onOpenChange,
}: Required<Pick<ScheduledCreditCardChargeDialogProps, "bill" | "creditCard">> &
  Pick<
    ScheduledCreditCardChargeDialogProps,
    "trigger" | "open" | "onOpenChange"
  >) {
  return (
    <ScheduledCreditCardChargeDialog
      bill={bill}
      creditCard={creditCard}
      trigger={trigger}
      open={open}
      onOpenChange={onOpenChange}
    />
  )
}

function ScheduledCreditCardChargeDialog({
  bill,
  creditCard,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: ScheduledCreditCardChargeDialogProps) {
  const { actions, state } = useFinance()
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const [deleteStatusMessage, setDeleteStatusMessage] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const isEditing = Boolean(bill)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen
  const localToday = getForecastLocalDate(
    new Date(),
    state.preferences.timezone,
  )
  const defaultCategoryId =
    state.categories.find((category) => category.slug === "bills")?.id ??
    state.categories[0]?.id ??
    ""
  const defaultValues = useMemo<ScheduledChargeFormValues>(
    () => ({
      counterpartyId: bill?.counterpartyId ?? state.counterparties[0]?.id ?? "",
      concept: bill?.concept ?? "",
      amount: bill ? formatDollarInput(bill.amount) : "",
      chargeDate: bill?.firstDueDate ?? "",
      categoryId: bill?.categoryId ?? defaultCategoryId,
    }),
    [bill, defaultCategoryId, state.counterparties],
  )
  const schema = useMemo(
    () =>
      isEditing
        ? scheduledChargeFormSchema
        : scheduledChargeFormSchema.refine(
            (value) => value.chargeDate > localToday,
            {
              path: ["chargeDate"],
              message: "Choose a future charge date.",
            },
          ),
    [isEditing, localToday],
  )
  const setOpen = (nextOpen: boolean) => {
    if (!isControlled) {
      setUncontrolledOpen(nextOpen)
    }

    onOpenChange?.(nextOpen)
  }
  const form = useStandardForm<
    ScheduledChargeFormValues,
    z.output<typeof scheduledChargeFormSchema>
  >({
    defaultValues,
    schema,
    onSubmit: async ({ applyActionResult, resetForm, value }) => {
      const payload: CreatableRecurringBillRecord = {
        id: bill?.id ?? crypto.randomUUID(),
        counterparty_id: value.counterpartyId,
        concept: value.concept,
        amount_cents: value.amount,
        currency: state.preferences.default_currency,
        frequency: "one_time",
        first_due_date: value.chargeDate,
        total_payments: 1,
        credit_card_id: creditCard.id,
        category_id: value.categoryId,
      }
      const result = bill
        ? await actions.updateRecurringBill(bill.id, {
            counterparty_id: payload.counterparty_id,
            concept: payload.concept,
            amount_cents: payload.amount_cents,
            first_due_date: payload.first_due_date,
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
  })

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
            {isEditing ? "Edit Scheduled Charge" : "Add Scheduled Charge"}
          </DialogTitle>
          <DialogDescription variant="finance">
            Reserve this amount now. It will join this card&apos;s statement on
            the scheduled charge date.
          </DialogDescription>
        </DialogHeader>
        <DialogCloseButton aria-label="Close scheduled charge dialog" />

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
                        ? "Save Scheduled Charge"
                        : "Add Scheduled Charge"}
                  </Button>
                )}
              </form.form.Subscribe>
              {bill && !bill.hasPayments ? (
                <>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        type="button"
                        variant="destructive"
                        size="finance-submit"
                        disabled={isDeleting}
                      >
                        Delete Scheduled Charge
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent variant="finance">
                      <AlertDialogHeader className="text-left">
                        <AlertDialogTitle variant="finance">
                          Delete Scheduled Charge?
                        </AlertDialogTitle>
                        <AlertDialogDescription variant="finance">
                          This removes the reservation and any pending statement
                          effect for this charge.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className="mt-5 flex justify-end gap-3">
                        <AlertDialogCancel>Keep Charge</AlertDialogCancel>
                        <AlertDialogAction
                          variant="destructive"
                          disabled={isDeleting}
                          onClick={handleDelete}
                        >
                          {isDeleting ? "Deleting..." : "Delete Charge"}
                        </AlertDialogAction>
                      </div>
                    </AlertDialogContent>
                  </AlertDialog>
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
          <div className="bg-background flex items-center gap-3 rounded-lg p-3">
            <CreditCardBadge
              className="size-10 rounded-lg"
              nickname={creditCard.nickname}
              initials={creditCard.initials}
              color={creditCard.color}
            />
            <div>
              <p className="text-sm font-bold">
                {creditCard.nickname} •••• {creditCard.lastFour}
              </p>
              <p className="text-muted-foreground text-xs">Charges To</p>
            </div>
          </div>

          <form.form.Field name="counterpartyId">
            {(field) => (
              <ContactSelectWithQuickCreate
                key={
                  open
                    ? "scheduled-charge-contact-open"
                    : "scheduled-charge-contact-closed"
                }
                id="scheduled-charge-contact"
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
                id="scheduled-charge-concept"
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
                    placeholder="e.g. Annual membership"
                  />
                )}
              </FormField>
            )}
          </form.form.Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <form.form.Field name="amount">
              {(field) => (
                <FormField
                  id="scheduled-charge-amount"
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
                  key={
                    open
                      ? "scheduled-charge-category-open"
                      : "scheduled-charge-category-closed"
                  }
                  id="scheduled-charge-category"
                  value={field.state.value}
                  onValueChange={(value) => form.setValue("categoryId", value)}
                  error={form.fieldErrors.categoryId}
                />
              )}
            </form.form.Field>
          </div>

          <form.form.Field name="chargeDate">
            {(field) => (
              <FormField
                id="scheduled-charge-date"
                label="Charge Date"
                error={form.fieldErrors.chargeDate}
              >
                {(fieldProps) => (
                  <Input
                    {...fieldProps}
                    type="date"
                    min={isEditing ? undefined : localToday}
                    value={field.state.value}
                    onChange={(event) =>
                      form.setValue("chargeDate", event.target.value)
                    }
                    onBlur={field.handleBlur}
                  />
                )}
              </FormField>
            )}
          </form.form.Field>
        </DialogFinanceForm>
      </DialogContent>
    </Dialog>
  )
}
