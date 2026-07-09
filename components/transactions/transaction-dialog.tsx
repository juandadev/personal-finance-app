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
import { Textarea } from "@/components/ui/textarea"
import { useFinance } from "@/hooks/use-finance"
import { formatDollarInput } from "@/lib/finance/form-utils"
import type { NewTransactionRecord } from "@/lib/finance/types"
import {
  currencyCentsSchema,
  optionalTrimmedStringSchema,
  requiredSelectSchema,
  requiredStringSchema,
} from "@/lib/forms/validation"
import { useStandardForm } from "@/lib/forms/use-standard-form"
import type { Transaction } from "@/lib/types"
import type { ThemeColor } from "@/lib/theme-colors"
import { getInitials } from "@/lib/utils"

const noBudgetValue = "none"

const transactionFormSchema = z
  .object({
    transactionType: z.enum(["expense", "income"]),
    amount: currencyCentsSchema("Enter an amount greater than $0."),
    postedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date."),
    concept: requiredStringSchema("Enter a transaction concept.", 80),
    categoryId: requiredSelectSchema("Choose a category."),
    counterpartyId: requiredSelectSchema("Choose a contact."),
    isVoucherExpense: z.boolean().default(false),
    paymentMethod: z.enum(["bank_account", "credit_card", "voucher"]),
    creditCardId: z.string(),
    description: optionalTrimmedStringSchema(240),
    budgetId: z.string(),
  })
  .superRefine((value, context) => {
    if (
      value.transactionType === "income" &&
      (value.isVoucherExpense || value.paymentMethod !== "bank_account")
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Alternate payment methods can only be used for expenses.",
        path: ["paymentMethod"],
      })
    }

    if (
      value.transactionType === "expense" &&
      value.paymentMethod === "credit_card" &&
      !value.creditCardId
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Choose a credit card.",
        path: ["creditCardId"],
      })
    }
  })

type TransactionFormValues = z.input<typeof transactionFormSchema>
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
        paymentMethod:
          transaction && transaction.amount < 0
            ? transaction.paymentMethod === "credit_card_payment"
              ? "bank_account"
              : transaction.paymentMethod
            : "bank_account",
        creditCardId:
          transaction?.creditCardId ??
          state.creditCards.find((card) => !card.archived_at)?.id ??
          "",
        description: transaction?.description ?? "",
        budgetId: transaction?.budgetId ?? noBudgetValue,
      }) satisfies TransactionFormValues,
    [state.categories, state.counterparties, state.creditCards, transaction],
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
      const paymentMethod =
        value.transactionType === "expense"
          ? value.paymentMethod
          : "bank_account"
      const isVoucherExpense = paymentMethod === "voucher"
      const payload: NewTransactionRecord = {
        id: transaction?.id ?? crypto.randomUUID(),
        account_id: accountId,
        counterparty_id: value.counterpartyId,
        category_id: value.categoryId,
        concept: value.concept,
        amount_cents: signedAmount,
        is_voucher_expense: isVoucherExpense,
        payment_method: paymentMethod,
        credit_card_id:
          paymentMethod === "credit_card" ? value.creditCardId : null,
        credit_card_statement_id: null,
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
  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)

    if (nextOpen) {
      mainForm.reset(mainDefaultValues)
      setDeleteStatusMessage("")
      return
    }

    if (!isEditing) {
      mainForm.reset(mainDefaultValues)
    }

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
                      mainForm.setValue("paymentMethod", "bank_account")
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
              paymentMethod: formState.values.paymentMethod,
              transactionType: formState.values.transactionType,
            })}
          >
            {({ paymentMethod, transactionType }) => {
              if (transactionType !== "expense") {
                return null
              }

              return (
                <div className="bg-background space-y-3 rounded-lg p-3">
                  <mainForm.form.Field name="paymentMethod">
                    {(field) => (
                      <FormSelect
                        id="transaction-payment-method"
                        label="Payment Source"
                        value={field.state.value}
                        onValueChange={(value) => {
                          const nextMethod = value as
                            "bank_account" | "credit_card" | "voucher"

                          mainForm.setValue("paymentMethod", nextMethod)
                          mainForm.setValue(
                            "isVoucherExpense",
                            nextMethod === "voucher",
                          )
                        }}
                        options={[
                          { value: "bank_account", label: "Bank Account" },
                          { value: "credit_card", label: "Credit Card" },
                          { value: "voucher", label: "Voucher" },
                        ]}
                        error={mainForm.fieldErrors.paymentMethod}
                      />
                    )}
                  </mainForm.form.Field>
                  {paymentMethod === "credit_card" ? (
                    <mainForm.form.Field name="creditCardId">
                      {(field) => (
                        <FormSelect
                          id="transaction-credit-card"
                          label="Credit Card"
                          value={field.state.value}
                          onValueChange={(value) =>
                            mainForm.setValue("creditCardId", value)
                          }
                          options={state.creditCards
                            .filter((card) => !card.archived_at)
                            .map((card) => ({
                              value: card.id,
                              label: `${card.nickname} •••• ${card.last_four}`,
                              creditCardAvatar: {
                                nickname: card.nickname,
                                initials: getInitials(card.nickname),
                                color: card.theme_color,
                              },
                            }))}
                          placeholder="Select a card"
                          error={mainForm.fieldErrors.creditCardId}
                        />
                      )}
                    </mainForm.form.Field>
                  ) : null}
                  <p className="text-muted-foreground text-xs leading-normal">
                    {paymentMethod === "credit_card"
                      ? "Card purchases update budgets now and reduce your bank balance when the statement is paid."
                      : paymentMethod === "voucher"
                        ? "Voucher expenses reduce budgets but do not change your account balance."
                        : "Bank expenses update your current balance immediately."}
                  </p>
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
              <CategorySelectWithQuickCreate
                key={
                  open
                    ? "transaction-category-open"
                    : "transaction-category-closed"
                }
                id="transaction-category"
                value={field.state.value}
                onValueChange={(value) =>
                  mainForm.setValue("categoryId", value)
                }
                error={mainForm.fieldErrors.categoryId}
              />
            )}
          </mainForm.form.Field>

          <mainForm.form.Field name="counterpartyId">
            {(field) => (
              <ContactSelectWithQuickCreate
                key={
                  open
                    ? "transaction-contact-open"
                    : "transaction-contact-closed"
                }
                id="transaction-contact"
                value={field.state.value}
                onValueChange={(value) =>
                  mainForm.setValue("counterpartyId", value)
                }
                error={mainForm.fieldErrors.counterpartyId}
              />
            )}
          </mainForm.form.Field>

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
  options: SelectOption[]
  placeholder?: string
  value: string
}) {
  const [selectKey, setSelectKey] = useState(0)
  const selectedOption = options.find((option) => option.value === value)

  const handleValueChange = (nextValue: string) => {
    if (createItem && nextValue === createItem.value) {
      setSelectKey((currentKey) => currentKey + 1)
      createItem.onSelect()
      return
    }

    onValueChange(nextValue)
  }

  return (
    <FormField id={id} label={label} error={error}>
      {(fieldProps) => (
        <Select key={selectKey} value={value} onValueChange={handleValueChange}>
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
