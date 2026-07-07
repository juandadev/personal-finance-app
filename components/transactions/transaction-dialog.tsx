"use client"

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { z } from "zod"

import { ThemeSelect } from "@/components/theme-select"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useFinance } from "@/hooks/use-finance"
import { formatDollarInput, themeOptions } from "@/lib/finance/form-utils"
import type { NewTransactionRecord } from "@/lib/finance/types"
import {
  currencyCentsSchema,
  optionalTrimmedStringSchema,
  requiredSelectSchema,
  requiredStringSchema,
  themeColorSchema,
} from "@/lib/forms/validation"
import { useStandardForm } from "@/lib/forms/use-standard-form"
import type { Transaction } from "@/lib/types"

const noBudgetValue = "none"
const createCategoryValue = "__create-category"
const createContactValue = "__create-contact"

const transactionFormSchema = z
  .object({
    transactionType: z.enum(["expense", "income"]),
    amount: currencyCentsSchema("Enter an amount greater than $0."),
    postedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date."),
    concept: requiredStringSchema("Enter a transaction concept.", 80),
    categoryId: requiredSelectSchema("Choose a category."),
    counterpartyId: requiredSelectSchema("Choose a contact."),
    isVoucherExpense: z.boolean().default(false),
    description: optionalTrimmedStringSchema(240),
    budgetId: z.string(),
  })
  .superRefine((value, context) => {
    if (value.transactionType === "income" && value.isVoucherExpense) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Voucher payments can only be used for expenses.",
        path: ["isVoucherExpense"],
      })
    }
  })

const quickCategorySchema = z.object({
  name: requiredStringSchema("Enter a category name.", 40),
  themeColor: themeColorSchema,
})

const quickContactSchema = z.object({
  displayName: requiredStringSchema("Enter a contact name.", 60),
  type: z.enum(["person", "merchant"]),
  themeColor: themeColorSchema,
  notes: optionalTrimmedStringSchema(240),
})

type TransactionFormValues = z.input<typeof transactionFormSchema>
type QuickCategoryValues = z.input<typeof quickCategorySchema>
type QuickContactValues = z.input<typeof quickContactSchema>

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

interface TransactionDialogProps {
  transaction?: Transaction
  trigger?: ReactNode
}

export function AddTransactionDialog() {
  return <TransactionDialog trigger={<Button>Add Transaction</Button>} />
}

export function EditTransactionDialog({
  transaction,
}: {
  transaction: Transaction
}) {
  return (
    <TransactionDialog
      transaction={transaction}
      trigger={
        <Button variant="ghost" size="sm">
          Edit
        </Button>
      }
    />
  )
}

function TransactionDialog({ transaction, trigger }: TransactionDialogProps) {
  const { state, actions } = useFinance()
  const isEditing = Boolean(transaction)
  const [open, setOpen] = useState(false)
  const [showQuickCategoryForm, setShowQuickCategoryForm] = useState(false)
  const [showQuickContactForm, setShowQuickContactForm] = useState(false)
  const [deleteStatusMessage, setDeleteStatusMessage] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)

  const mainDefaultValues = useMemo(
    () =>
      ({
        transactionType:
          transaction && transaction.amount > 0 ? "income" : "expense",
        amount: transaction
          ? formatDollarInput(Math.abs(transaction.amount))
          : "",
        postedAt: transaction?.postedAt ?? todayIsoDate(),
        concept: transaction?.concept ?? "",
        categoryId: transaction?.categoryId ?? state.categories[0]?.id ?? "",
        counterpartyId:
          transaction?.counterpartyId ?? state.counterparties[0]?.id ?? "",
        isVoucherExpense:
          transaction && transaction.amount < 0
            ? transaction.isVoucherExpense
            : false,
        description: transaction?.description ?? "",
        budgetId: transaction?.budgetId ?? noBudgetValue,
      }) satisfies TransactionFormValues,
    [state.categories, state.counterparties, transaction],
  )
  const quickCategoryDefaultValues = useMemo(
    () =>
      ({
        name: "",
        themeColor: themeOptions[0].value,
      }) satisfies QuickCategoryValues,
    [],
  )
  const quickContactDefaultValues = useMemo(
    () =>
      ({
        displayName: "",
        type: "person",
        themeColor: themeOptions[1]?.value ?? themeOptions[0].value,
        notes: "",
      }) satisfies QuickContactValues,
    [],
  )

  const mainForm = useStandardForm({
    defaultValues: mainDefaultValues,
    schema: transactionFormSchema,
    onSubmit: async ({ applyActionResult, resetForm, value }) => {
      const accountId = transaction?.accountId ?? state.accounts[0]?.id ?? ""

      if (!accountId) {
        applyActionResult({
          ok: false,
          message: "Your main account is not ready yet. Refresh and try again.",
        })
        return
      }

      const matchingBudgets = getMatchingBudgets({
        budgets: state.budgets,
        categoryId: value.categoryId,
        postedAt: value.postedAt,
        transactionType: value.transactionType,
      })
      const selectedBudgetId = matchingBudgets.some(
        (budget) => budget.id === value.budgetId,
      )
        ? value.budgetId
        : noBudgetValue
      const signedAmount =
        value.transactionType === "income" ? value.amount : value.amount * -1
      const isVoucherExpense =
        value.transactionType === "expense" ? value.isVoucherExpense : false
      const payload: NewTransactionRecord = {
        id: transaction?.id ?? crypto.randomUUID(),
        account_id: accountId,
        counterparty_id: value.counterpartyId,
        category_id: value.categoryId,
        concept: value.concept,
        amount_cents: signedAmount,
        is_voucher_expense: isVoucherExpense,
        posted_at: value.postedAt,
        description: value.description || null,
      }
      const nextBudgetId =
        value.transactionType === "expense" &&
        selectedBudgetId !== noBudgetValue
          ? selectedBudgetId
          : null

      const result = transaction
        ? await actions.updateTransaction(transaction.id, payload, nextBudgetId)
        : await actions.addTransaction(payload, nextBudgetId)

      if (!applyActionResult(result)) {
        return
      }

      setOpen(false)

      if (!transaction) {
        resetForm(mainDefaultValues)
      }
    },
  })
  const quickCategoryForm = useStandardForm({
    defaultValues: quickCategoryDefaultValues,
    schema: quickCategorySchema,
    onSubmit: async ({ applyActionResult, resetForm, value }) => {
      const id = crypto.randomUUID()
      const result = await actions.addCategory({
        id,
        name: value.name,
        theme_color: value.themeColor,
      })

      if (!applyActionResult(result) || !result.ok) {
        return
      }

      mainForm.setValue("categoryId", id)
      setShowQuickCategoryForm(false)
      resetForm(quickCategoryDefaultValues)
    },
  })
  const quickContactForm = useStandardForm({
    defaultValues: quickContactDefaultValues,
    schema: quickContactSchema,
    onSubmit: async ({ applyActionResult, resetForm, value }) => {
      const id = crypto.randomUUID()
      const result = await actions.addCounterparty({
        id,
        display_name: value.displayName,
        type: value.type,
        theme_color: value.themeColor,
        notes: value.notes,
      })

      if (!applyActionResult(result) || !result.ok) {
        return
      }

      mainForm.setValue("counterpartyId", id)
      setShowQuickContactForm(false)
      resetForm(quickContactDefaultValues)
    },
  })

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)

    if (nextOpen) {
      mainForm.reset(mainDefaultValues)
      quickCategoryForm.reset(quickCategoryDefaultValues)
      quickContactForm.reset(quickContactDefaultValues)
      setShowQuickCategoryForm(false)
      setShowQuickContactForm(false)
      setDeleteStatusMessage("")
      return
    }

    if (!isEditing) {
      mainForm.reset(mainDefaultValues)
    }

    quickCategoryForm.reset(quickCategoryDefaultValues)
    quickContactForm.reset(quickContactDefaultValues)
    setShowQuickCategoryForm(false)
    setShowQuickContactForm(false)
    setDeleteStatusMessage("")
  }

  const handleDelete = async () => {
    if (!transaction) {
      return
    }

    setIsDeleting(true)
    setDeleteStatusMessage("")

    const result = await actions.deleteTransaction(transaction.id)

    setIsDeleting(false)

    if (!result.ok) {
      setDeleteStatusMessage(result.message)
      return
    }

    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent variant="finance" showCloseButton={false}>
        <DialogHeader className="text-left">
          <DialogTitle variant="finance">
            {isEditing ? "Edit Transaction" : "Add Transaction"}
          </DialogTitle>
          <DialogDescription variant="finance">
            Record a transaction with a category, contact, and optional matching
            budget.
          </DialogDescription>
        </DialogHeader>

        <DialogCloseButton aria-label="Close transaction dialog" />

        <form className="mt-6 space-y-5" onSubmit={mainForm.handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <mainForm.form.Field name="transactionType">
              {(field) => (
                <FormSelect
                  id="transaction-type"
                  label="Type"
                  value={field.state.value}
                  onValueChange={(value) => {
                    const nextType = value as "expense" | "income"

                    mainForm.setValue("transactionType", nextType)

                    if (nextType === "income") {
                      mainForm.setValue("isVoucherExpense", false)
                    }
                  }}
                  options={[
                    { value: "expense", label: "Expense" },
                    { value: "income", label: "Income" },
                  ]}
                  error={mainForm.fieldErrors.transactionType}
                />
              )}
            </mainForm.form.Field>
            <mainForm.form.Field name="amount">
              {(field) => (
                <FormField
                  id="transaction-amount"
                  label="Amount"
                  error={mainForm.fieldErrors.amount}
                >
                  {(fieldProps) => (
                    <CurrencyInput
                      {...fieldProps}
                      inputMode="decimal"
                      value={field.state.value}
                      onChange={(event) =>
                        mainForm.setValue("amount", event.target.value)
                      }
                      onBlur={field.handleBlur}
                      placeholder="e.g. 250"
                    />
                  )}
                </FormField>
              )}
            </mainForm.form.Field>
          </div>

          <mainForm.form.Subscribe
            selector={(formState) => ({
              isVoucherExpense: formState.values.isVoucherExpense,
              transactionType: formState.values.transactionType,
            })}
          >
            {({ isVoucherExpense, transactionType }) => {
              if (transactionType !== "expense") {
                return null
              }

              const helperId = "voucher-expense-helper"
              const error = mainForm.fieldErrors.isVoucherExpense

              return (
                <div className="border-border bg-background rounded-lg border p-3">
                  <div className="flex items-start gap-3">
                    <mainForm.form.Field name="isVoucherExpense">
                      {(field) => (
                        <Checkbox
                          id="voucher-expense"
                          className="mt-0.5"
                          checked={isVoucherExpense}
                          aria-invalid={error ? "true" : "false"}
                          aria-describedby={helperId}
                          onCheckedChange={(checked) =>
                            mainForm.setValue(
                              "isVoucherExpense",
                              checked === true,
                            )
                          }
                          onBlur={field.handleBlur}
                        />
                      )}
                    </mainForm.form.Field>
                    <div className="space-y-1">
                      <Label
                        htmlFor="voucher-expense"
                        className="text-foreground text-sm font-bold"
                      >
                        Paid with voucher
                      </Label>
                      <p
                        id={helperId}
                        className="text-muted-foreground text-xs leading-normal"
                      >
                        Voucher expenses reduce budgets but do not change your
                        account balance.
                      </p>
                      {error ? (
                        <p className="text-destructive text-xs leading-normal">
                          {error}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              )
            }}
          </mainForm.form.Subscribe>

          <mainForm.form.Field name="postedAt">
            {(field) => (
              <FormField
                id="transaction-date"
                label="Date"
                error={mainForm.fieldErrors.postedAt}
              >
                {(fieldProps) => (
                  <Input
                    {...fieldProps}
                    type="date"
                    value={field.state.value}
                    onChange={(event) =>
                      mainForm.setValue("postedAt", event.target.value)
                    }
                    onBlur={field.handleBlur}
                  />
                )}
              </FormField>
            )}
          </mainForm.form.Field>

          <mainForm.form.Field name="concept">
            {(field) => (
              <FormField
                id="transaction-concept"
                label="Concept"
                error={mainForm.fieldErrors.concept}
              >
                {(fieldProps) => (
                  <Input
                    {...fieldProps}
                    value={field.state.value}
                    onChange={(event) =>
                      mainForm.setValue("concept", event.target.value)
                    }
                    onBlur={field.handleBlur}
                    placeholder="e.g. July salary or Weekly groceries"
                  />
                )}
              </FormField>
            )}
          </mainForm.form.Field>

          <mainForm.form.Field name="categoryId">
            {(field) => (
              <FormSelect
                id="transaction-category"
                label="Category"
                value={field.state.value}
                onValueChange={(value) => {
                  mainForm.setValue("categoryId", value)
                  setShowQuickCategoryForm(false)
                }}
                options={state.categories.map((category) => ({
                  value: category.id,
                  label: category.name,
                }))}
                placeholder="Select a category"
                createItem={{
                  value: createCategoryValue,
                  label: "Add a new category",
                  onSelect: () => setShowQuickCategoryForm(true),
                }}
                error={mainForm.fieldErrors.categoryId}
              />
            )}
          </mainForm.form.Field>

          {showQuickCategoryForm ? (
            <QuickCategoryPanel
              form={quickCategoryForm}
              onCancel={() => setShowQuickCategoryForm(false)}
            />
          ) : null}

          <mainForm.form.Field name="counterpartyId">
            {(field) => (
              <FormSelect
                id="transaction-contact"
                label="Contact"
                value={field.state.value}
                onValueChange={(value) => {
                  mainForm.setValue("counterpartyId", value)
                  setShowQuickContactForm(false)
                }}
                options={state.counterparties.map((counterparty) => ({
                  value: counterparty.id,
                  label: counterparty.display_name,
                }))}
                placeholder="Select a contact"
                createItem={{
                  value: createContactValue,
                  label: "Add a new contact",
                  onSelect: () => setShowQuickContactForm(true),
                }}
                error={mainForm.fieldErrors.counterpartyId}
              />
            )}
          </mainForm.form.Field>

          {showQuickContactForm ? (
            <QuickContactPanel
              form={quickContactForm}
              onCancel={() => setShowQuickContactForm(false)}
            />
          ) : null}

          <mainForm.form.Subscribe
            selector={(formState) => ({
              budgetId: formState.values.budgetId,
              categoryId: formState.values.categoryId,
              postedAt: formState.values.postedAt,
              transactionType: formState.values.transactionType,
            })}
          >
            {({ budgetId, categoryId, postedAt, transactionType }) => {
              if (transactionType !== "expense") {
                return null
              }

              const matchingBudgets = getMatchingBudgets({
                budgets: state.budgets,
                categoryId,
                postedAt,
                transactionType,
              })
              const selectedBudgetId = matchingBudgets.some(
                (budget) => budget.id === budgetId,
              )
                ? budgetId
                : noBudgetValue

              return (
                <div className="space-y-2">
                  <FormSelect
                    id="transaction-budget"
                    label="Matching Budget"
                    value={selectedBudgetId}
                    onValueChange={(value) =>
                      mainForm.setValue("budgetId", value)
                    }
                    options={[
                      { value: noBudgetValue, label: "No budget" },
                      ...matchingBudgets.map((budget) => ({
                        value: budget.id,
                        label:
                          state.categories.find(
                            (category) => category.id === budget.category_id,
                          )?.name ?? "Budget",
                      })),
                    ]}
                  />
                  {matchingBudgets.length === 0 ? (
                    <p className="text-muted-foreground text-xs">
                      No matching active budget for this category and date.
                    </p>
                  ) : null}
                </div>
              )
            }}
          </mainForm.form.Subscribe>

          <mainForm.form.Field name="description">
            {(field) => (
              <FormField
                id="transaction-description"
                label="Description"
                error={mainForm.fieldErrors.description}
              >
                {(fieldProps) => (
                  <Textarea
                    {...fieldProps}
                    value={field.state.value}
                    onChange={(event) =>
                      mainForm.setValue("description", event.target.value)
                    }
                    onBlur={field.handleBlur}
                    placeholder="Optional note"
                  />
                )}
              </FormField>
            )}
          </mainForm.form.Field>

          {mainForm.status?.message ? (
            <FormStatusMessage variant={mainForm.status.variant}>
              {mainForm.status.message}
            </FormStatusMessage>
          ) : null}

          <mainForm.form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <Button
                type="submit"
                size="finance-submit"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "Saving..."
                  : isEditing
                    ? "Save Transaction"
                    : "Add Transaction"}
              </Button>
            )}
          </mainForm.form.Subscribe>

          {transaction ? (
            <>
              <Button
                type="button"
                variant="destructive"
                size="finance-submit"
                disabled={isDeleting}
                onClick={handleDelete}
              >
                {isDeleting ? "Deleting..." : "Delete Transaction"}
              </Button>
              {deleteStatusMessage ? (
                <FormStatusMessage variant="error">
                  {deleteStatusMessage}
                </FormStatusMessage>
              ) : null}
            </>
          ) : null}
        </form>
      </DialogContent>
    </Dialog>
  )
}

function QuickCategoryPanel({
  form,
  onCancel,
}: {
  form: ReturnType<
    typeof useStandardForm<
      QuickCategoryValues,
      z.output<typeof quickCategorySchema>
    >
  >
  onCancel: () => void
}) {
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nameInputRef.current?.focus()
  }, [])

  return (
    <div className="bg-background space-y-3 rounded-lg p-3">
      <p className="text-muted-foreground text-xs font-bold">
        Quick Create Category
      </p>
      <form.form.Field name="name">
        {(field) => (
          <FormField
            id="quick-category-name"
            label="Name"
            error={form.fieldErrors.name}
          >
            {(fieldProps) => (
              <Input
                {...fieldProps}
                ref={nameInputRef}
                value={field.state.value}
                onChange={(event) => form.setValue("name", event.target.value)}
                onBlur={field.handleBlur}
                placeholder="New category name"
              />
            )}
          </FormField>
        )}
      </form.form.Field>
      <form.form.Field name="themeColor">
        {(field) => (
          <ThemeSelect
            id="quick-category-theme"
            value={field.state.value}
            onValueChange={(value) => form.setValue("themeColor", value)}
          />
        )}
      </form.form.Field>
      {form.status?.message ? (
        <FormStatusMessage variant={form.status.variant}>
          {form.status.message}
        </FormStatusMessage>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <form.form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isSubmitting}
              onClick={() => void form.form.handleSubmit()}
            >
              {isSubmitting ? "Adding..." : "Add Category"}
            </Button>
          )}
        </form.form.Subscribe>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

function QuickContactPanel({
  form,
  onCancel,
}: {
  form: ReturnType<
    typeof useStandardForm<
      QuickContactValues,
      z.output<typeof quickContactSchema>
    >
  >
  onCancel: () => void
}) {
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nameInputRef.current?.focus()
  }, [])

  return (
    <div className="bg-background space-y-3 rounded-lg p-3">
      <p className="text-muted-foreground text-xs font-bold">
        Quick Create Contact
      </p>
      <form.form.Field name="displayName">
        {(field) => (
          <FormField
            id="quick-contact-name"
            label="Name"
            error={form.fieldErrors.displayName}
          >
            {(fieldProps) => (
              <Input
                {...fieldProps}
                ref={nameInputRef}
                value={field.state.value}
                onChange={(event) =>
                  form.setValue("displayName", event.target.value)
                }
                onBlur={field.handleBlur}
                placeholder="New contact name"
              />
            )}
          </FormField>
        )}
      </form.form.Field>
      <form.form.Field name="type">
        {(field) => (
          <FormSelect
            id="quick-contact-type"
            label="Contact Type"
            value={field.state.value}
            onValueChange={(value) =>
              form.setValue("type", value as "person" | "merchant")
            }
            options={[
              { value: "person", label: "Person" },
              { value: "merchant", label: "Merchant" },
            ]}
            error={form.fieldErrors.type}
          />
        )}
      </form.form.Field>
      <form.form.Field name="themeColor">
        {(field) => (
          <ThemeSelect
            id="quick-contact-theme"
            value={field.state.value}
            onValueChange={(value) => form.setValue("themeColor", value)}
          />
        )}
      </form.form.Field>
      <form.form.Field name="notes">
        {(field) => (
          <FormField
            id="quick-contact-notes"
            label="Notes"
            error={form.fieldErrors.notes}
          >
            {(fieldProps) => (
              <Textarea
                {...fieldProps}
                value={field.state.value}
                onChange={(event) => form.setValue("notes", event.target.value)}
                onBlur={field.handleBlur}
                placeholder="Optional notes"
              />
            )}
          </FormField>
        )}
      </form.form.Field>
      {form.status?.message ? (
        <FormStatusMessage variant={form.status.variant}>
          {form.status.message}
        </FormStatusMessage>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <form.form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isSubmitting}
              onClick={() => void form.form.handleSubmit()}
            >
              {isSubmitting ? "Adding..." : "Add Contact"}
            </Button>
          )}
        </form.form.Subscribe>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

function FormSelect({
  createItem,
  error,
  id,
  label,
  onValueChange,
  options,
  placeholder = "Select an option",
  value,
}: {
  createItem?: { value: string; label: string; onSelect: () => void }
  error?: string
  id: string
  label: string
  onValueChange: (value: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
  value: string
}) {
  const handleValueChange = (nextValue: string) => {
    if (createItem && nextValue === createItem.value) {
      createItem.onSelect()
      return
    }

    onValueChange(nextValue)
  }

  return (
    <FormField id={id} label={label} error={error}>
      {(fieldProps) => (
        <Select value={value} onValueChange={handleValueChange}>
          <SelectTrigger {...fieldProps} variant="form">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent className="max-h-107.5" matchTriggerWidth>
            {options.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                variant="form"
              >
                {option.label}
              </SelectItem>
            ))}
            {createItem ? (
              <SelectItem value={createItem.value} variant="form">
                {createItem.label}
              </SelectItem>
            ) : null}
          </SelectContent>
        </Select>
      )}
    </FormField>
  )
}

function getMatchingBudgets({
  budgets,
  categoryId,
  postedAt,
  transactionType,
}: {
  budgets: ReturnType<typeof useFinance>["state"]["budgets"]
  categoryId: string
  postedAt: string
  transactionType: "expense" | "income"
}) {
  if (transactionType !== "expense") {
    return []
  }

  return budgets.filter(
    (budget) =>
      budget.category_id === categoryId && postedAt.startsWith(budget.period),
  )
}
