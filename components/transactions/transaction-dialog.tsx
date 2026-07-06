"use client"

import { useMemo, useState, type FormEvent, type ReactNode } from "react"
import { AuthStatusMessage } from "@/components/auth/auth-page-shell"
import { ThemeSelect } from "@/components/theme-select"
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
import {
  formatDollarInput,
  parseDollarAmount,
  themeOptions,
} from "@/lib/finance/form-utils"
import type { NewTransactionRecord } from "@/lib/finance/types"
import type { Transaction } from "@/lib/types"
import type { ThemeColor } from "@/lib/theme-colors"

const noBudgetValue = "none"
const createCategoryValue = "__create-category"
const createContactValue = "__create-contact"

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
  const [transactionType, setTransactionType] = useState<"expense" | "income">(
    transaction && transaction.amount > 0 ? "income" : "expense",
  )
  const [amount, setAmount] = useState(
    transaction ? formatDollarInput(Math.abs(transaction.amount)) : "",
  )
  const [accountId, setAccountId] = useState(
    transaction?.accountId ?? state.accounts[0]?.id ?? "",
  )
  const [postedAt, setPostedAt] = useState(
    transaction?.postedAt ?? todayIsoDate(),
  )
  const [concept, setConcept] = useState(transaction?.concept ?? "")
  const [categoryId, setCategoryId] = useState(
    transaction?.categoryId ?? state.categories[0]?.id ?? "",
  )
  const [counterpartyId, setCounterpartyId] = useState(
    transaction?.counterpartyId ?? state.counterparties[0]?.id ?? "",
  )
  const [description, setDescription] = useState(transaction?.description ?? "")
  const [budgetId, setBudgetId] = useState(
    transaction?.budgetId ?? noBudgetValue,
  )
  const [quickCategoryName, setQuickCategoryName] = useState("")
  const [showQuickCategoryForm, setShowQuickCategoryForm] = useState(false)
  const [quickCategoryTheme, setQuickCategoryTheme] = useState<ThemeColor>(
    themeOptions[0].value,
  )
  const [quickContactName, setQuickContactName] = useState("")
  const [showQuickContactForm, setShowQuickContactForm] = useState(false)
  const [quickContactType, setQuickContactType] = useState<
    "person" | "merchant"
  >("person")
  const [quickContactTheme, setQuickContactTheme] = useState<ThemeColor>(
    themeOptions[1]?.value ?? themeOptions[0].value,
  )
  const [quickContactNotes, setQuickContactNotes] = useState("")
  const [statusMessage, setStatusMessage] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isQuickSaving, setIsQuickSaving] = useState(false)

  const matchingBudgets = useMemo(() => {
    if (transactionType !== "expense") {
      return []
    }

    return state.budgets.filter(
      (budget) =>
        budget.category_id === categoryId && postedAt.startsWith(budget.period),
    )
  }, [categoryId, postedAt, state.budgets, transactionType])

  const selectedBudgetId = matchingBudgets.some(
    (budget) => budget.id === budgetId,
  )
    ? budgetId
    : noBudgetValue

  const resetForm = () => {
    setTransactionType("expense")
    setAmount("")
    setAccountId(state.accounts[0]?.id ?? "")
    setPostedAt(todayIsoDate())
    setConcept("")
    setCategoryId(state.categories[0]?.id ?? "")
    setCounterpartyId(state.counterparties[0]?.id ?? "")
    setDescription("")
    setBudgetId(noBudgetValue)
    setQuickCategoryName("")
    setShowQuickCategoryForm(false)
    setQuickContactName("")
    setShowQuickContactForm(false)
    setQuickContactNotes("")
    setStatusMessage("")
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)

    if (!nextOpen && !isEditing) {
      resetForm()
    }
  }

  const handleQuickCategory = async () => {
    const name = quickCategoryName.trim()

    if (!name) {
      setStatusMessage("Enter a category name.")
      return
    }

    const id = crypto.randomUUID()
    setIsQuickSaving(true)
    setStatusMessage("")

    const result = await actions.addCategory({
      id,
      name,
      theme_color: quickCategoryTheme,
    })

    setIsQuickSaving(false)

    if (!result.ok) {
      setStatusMessage(result.message)
      return
    }

    setCategoryId(id)
    setQuickCategoryName("")
    setShowQuickCategoryForm(false)
  }

  const handleQuickContact = async () => {
    const displayName = quickContactName.trim()

    if (!displayName) {
      setStatusMessage("Enter a contact name.")
      return
    }

    const id = crypto.randomUUID()
    setIsQuickSaving(true)
    setStatusMessage("")

    const result = await actions.addCounterparty({
      id,
      display_name: displayName,
      type: quickContactType,
      theme_color: quickContactTheme,
      notes: quickContactNotes,
    })

    setIsQuickSaving(false)

    if (!result.ok) {
      setStatusMessage(result.message)
      return
    }

    setCounterpartyId(id)
    setQuickContactName("")
    setQuickContactNotes("")
    setShowQuickContactForm(false)
  }

  const handleDelete = async () => {
    if (!transaction) {
      return
    }

    setIsSaving(true)
    setStatusMessage("")

    const result = await actions.deleteTransaction(transaction.id)

    setIsSaving(false)

    if (!result.ok) {
      setStatusMessage(result.message)
      return
    }

    setOpen(false)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatusMessage("")

    const amountCents = parseDollarAmount(amount)

    if (amountCents === null) {
      setStatusMessage("Enter an amount greater than $0.")
      return
    }

    if (!concept.trim()) {
      setStatusMessage("Enter a transaction concept.")
      return
    }

    if (!accountId || !categoryId || !counterpartyId) {
      setStatusMessage("Choose an account, category, and contact.")
      return
    }

    const signedAmount =
      transactionType === "income" ? amountCents : amountCents * -1
    const payload: NewTransactionRecord = {
      id: transaction?.id ?? crypto.randomUUID(),
      account_id: accountId,
      counterparty_id: counterpartyId,
      category_id: categoryId,
      concept: concept.trim(),
      amount_cents: signedAmount,
      posted_at: postedAt,
      description: description.trim() || null,
    }
    const nextBudgetId =
      transactionType === "expense" && selectedBudgetId !== noBudgetValue
        ? selectedBudgetId
        : null

    setIsSaving(true)

    const result = transaction
      ? await actions.updateTransaction(transaction.id, payload, nextBudgetId)
      : await actions.addTransaction(payload, nextBudgetId)

    setIsSaving(false)

    if (!result.ok) {
      setStatusMessage(result.message)
      return
    }

    setOpen(false)

    if (!transaction) {
      resetForm()
    }
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

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormSelect
              id="transaction-type"
              label="Type"
              value={transactionType}
              onValueChange={(value) =>
                setTransactionType(value as "expense" | "income")
              }
              options={[
                { value: "expense", label: "Expense" },
                { value: "income", label: "Income" },
              ]}
            />
            <div className="space-y-2">
              <Label
                htmlFor="transaction-amount"
                className="text-muted-foreground text-xs font-bold"
              >
                Amount
              </Label>
              <CurrencyInput
                id="transaction-amount"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="e.g. 250"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormSelect
              id="transaction-account"
              label="Account"
              value={accountId}
              onValueChange={setAccountId}
              options={state.accounts.map((account) => ({
                value: account.id,
                label: account.name,
              }))}
              placeholder="Select an account"
            />
            <div className="space-y-2">
              <Label
                htmlFor="transaction-date"
                className="text-muted-foreground text-xs font-bold"
              >
                Date
              </Label>
              <Input
                id="transaction-date"
                type="date"
                value={postedAt}
                onChange={(event) => setPostedAt(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="transaction-concept"
              className="text-muted-foreground text-xs font-bold"
            >
              Concept
            </Label>
            <Input
              id="transaction-concept"
              value={concept}
              onChange={(event) => setConcept(event.target.value)}
              placeholder="e.g. July salary or Weekly groceries"
            />
          </div>

          <FormSelect
            id="transaction-category"
            label="Category"
            value={categoryId}
            onValueChange={(value) => {
              setCategoryId(value)
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
          />

          {showQuickCategoryForm ? (
            <div className="bg-background space-y-3 rounded-lg p-3">
              <p className="text-muted-foreground text-xs font-bold">
                Quick Create Category
              </p>
              <Input
                value={quickCategoryName}
                onChange={(event) => setQuickCategoryName(event.target.value)}
                placeholder="New category name"
              />
              <ThemeSelect
                id="quick-category-theme"
                value={quickCategoryTheme}
                onValueChange={setQuickCategoryTheme}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={isQuickSaving}
                onClick={handleQuickCategory}
              >
                Add Category
              </Button>
            </div>
          ) : null}

          <FormSelect
            id="transaction-contact"
            label="Contact"
            value={counterpartyId}
            onValueChange={(value) => {
              setCounterpartyId(value)
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
          />

          {showQuickContactForm ? (
            <div className="bg-background space-y-3 rounded-lg p-3">
              <p className="text-muted-foreground text-xs font-bold">
                Quick Create Contact
              </p>
              <Input
                value={quickContactName}
                onChange={(event) => setQuickContactName(event.target.value)}
                placeholder="New contact name"
              />
              <FormSelect
                id="quick-contact-type"
                label="Contact Type"
                value={quickContactType}
                onValueChange={(value) =>
                  setQuickContactType(value as "person" | "merchant")
                }
                options={[
                  { value: "person", label: "Person" },
                  { value: "merchant", label: "Merchant" },
                ]}
              />
              <ThemeSelect
                id="quick-contact-theme"
                value={quickContactTheme}
                onValueChange={setQuickContactTheme}
              />
              <Textarea
                value={quickContactNotes}
                onChange={(event) => setQuickContactNotes(event.target.value)}
                placeholder="Optional notes"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={isQuickSaving}
                onClick={handleQuickContact}
              >
                Add Contact
              </Button>
            </div>
          ) : null}

          {transactionType === "expense" ? (
            <div className="space-y-2">
              <FormSelect
                id="transaction-budget"
                label="Matching Budget"
                value={selectedBudgetId}
                onValueChange={setBudgetId}
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
          ) : null}

          <div className="space-y-2">
            <Label
              htmlFor="transaction-description"
              className="text-muted-foreground text-xs font-bold"
            >
              Description
            </Label>
            <Textarea
              id="transaction-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional note"
            />
          </div>

          <Button type="submit" size="finance-submit" disabled={isSaving}>
            {isSaving
              ? "Saving..."
              : isEditing
                ? "Save Transaction"
                : "Add Transaction"}
          </Button>

          {transaction ? (
            <Button
              type="button"
              variant="destructive"
              size="finance-submit"
              disabled={isSaving}
              onClick={handleDelete}
            >
              Delete Transaction
            </Button>
          ) : null}

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

function FormSelect({
  id,
  label,
  value,
  options,
  placeholder = "Select an option",
  createItem,
  onValueChange,
}: {
  id: string
  label: string
  value: string
  placeholder?: string
  options: { value: string; label: string }[]
  createItem?: { value: string; label: string; onSelect: () => void }
  onValueChange: (value: string) => void
}) {
  const handleValueChange = (nextValue: string) => {
    if (createItem && nextValue === createItem.value) {
      createItem.onSelect()
      return
    }

    onValueChange(nextValue)
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-muted-foreground text-xs font-bold">
        {label}
      </Label>
      <Select value={value} onValueChange={handleValueChange}>
        <SelectTrigger id={id} variant="form">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="max-h-107.5" matchTriggerWidth>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value} variant="form">
              {option.label}
            </SelectItem>
          ))}
          {createItem ? (
            <SelectItem
              value={createItem.value}
              variant="form"
              className="text-foreground border-muted-foreground/10 mt-1 border-t font-bold"
            >
              {createItem.label}
            </SelectItem>
          ) : null}
        </SelectContent>
      </Select>
    </div>
  )
}
