"use client"

import { useState } from "react"

import { ItemActions } from "@/components/actions"
import { AuthStatusMessage } from "@/components/auth/auth-page-shell"
import { ContactAvatar } from "@/components/contact-avatar"
import { EditTransactionDialog } from "@/components/transactions/transaction-dialog"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { useFinance } from "@/hooks/use-finance"
import { cn } from "@/lib/utils"
import { MoneyAmount } from "@/components/money-amount"
import { transactionAmountClassName } from "@/lib/format"
import type { Budget, Transaction } from "@/lib/types"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const UNASSIGNED_BUDGET_VALUE = "unassigned"
const DESKTOP_TABLE_CELL = "px-6 first:pl-0"
const DESKTOP_STICKY_AMOUNT_CELL =
  "bg-card border-border/60 sticky right-13.5 z-10 min-w-24 border-l px-3 text-right"
const DESKTOP_STICKY_ACTIONS_CELL =
  "bg-card sticky -right-2 z-20 w-16 px-2 text-right"
const DESKTOP_STICKY_AMOUNT_HEAD =
  "bg-card border-border/60 sticky right-13.5 z-20 min-w-24 border-l px-3 text-right"
const DESKTOP_STICKY_ACTIONS_HEAD =
  "bg-card sticky -right-2 z-30 w-16 px-2 text-right"

interface TransactionsTableProps {
  transactions: Transaction[]
}

export function TransactionsTable({ transactions }: TransactionsTableProps) {
  const { budgets, actions } = useFinance()
  const [pendingTransactionId, setPendingTransactionId] = useState<
    string | null
  >(null)
  const [statusMessage, setStatusMessage] = useState("")

  const handleBudgetChange = async (
    transaction: Transaction,
    budgetId: string,
  ) => {
    setStatusMessage("")
    setPendingTransactionId(transaction.id)

    const result =
      budgetId === UNASSIGNED_BUDGET_VALUE
        ? await actions.unassignTransactionFromBudget(transaction.id)
        : await actions.assignTransactionToBudget(transaction.id, budgetId)

    setPendingTransactionId(null)

    if (!result.ok) {
      setStatusMessage(result.message)
    }
  }

  return (
    <>
      {statusMessage ? (
        <AuthStatusMessage variant="error">{statusMessage}</AuthStatusMessage>
      ) : null}
      <ul className="divide-muted-foreground/10 divide-y md:hidden">
        {transactions.map((transaction) => (
          <MobileTransactionItem
            key={transaction.id}
            transaction={transaction}
          />
        ))}
      </ul>

      <div className="hidden md:block">
        <Table className="min-w-max border-separate border-spacing-0">
          <TableHeader>
            <TableRow>
              <TableHead className={DESKTOP_TABLE_CELL}>
                Recipient / Sender
              </TableHead>
              <TableHead className={DESKTOP_TABLE_CELL}>Concept</TableHead>
              <TableHead className={DESKTOP_TABLE_CELL}>Category</TableHead>
              <TableHead className={DESKTOP_TABLE_CELL}>Budget</TableHead>
              <TableHead className={DESKTOP_TABLE_CELL}>
                Transaction Date
              </TableHead>
              <TableHead className={DESKTOP_STICKY_AMOUNT_HEAD}>
                Amount
              </TableHead>
              <TableHead className={DESKTOP_STICKY_ACTIONS_HEAD}>
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => (
              <TransactionRow
                key={transaction.id}
                transaction={transaction}
                budgets={budgets}
                isPending={pendingTransactionId === transaction.id}
                onBudgetChange={handleBudgetChange}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}

interface TransactionItemProps {
  transaction: Transaction
  budgets: Budget[]
  isPending: boolean
  onBudgetChange: (transaction: Transaction, budgetId: string) => void
}

function MobileTransactionItem({ transaction }: { transaction: Transaction }) {
  const [isEditOpen, setIsEditOpen] = useState(false)

  return (
    <li className="flex items-center gap-2 py-3">
      <ContactAvatar
        name={transaction.name}
        initials={transaction.contactInitials}
        color={transaction.contactColor}
        avatarUrl={transaction.avatarUrl}
        className="shrink-0"
      />
      <div className="min-w-0 flex-1">
        <span className="text-foreground block truncate text-sm font-bold">
          {transaction.concept}
        </span>
        <span className="text-muted-foreground block truncate text-xs">
          {transaction.name}
        </span>
        {transaction.paymentMethod !== "bank_account" ? (
          <Badge variant="secondary" className="mt-1 max-w-full truncate">
            {transaction.paymentMethodLabel}
          </Badge>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <div className="flex flex-col items-end">
          <span
            className={cn(
              "text-sm font-bold tabular-nums",
              transactionAmountClassName(transaction.amount),
            )}
          >
            <MoneyAmount amount={transaction.amount} variant="signed" />
          </span>
          <span className="text-muted-foreground text-xs whitespace-nowrap">
            {transaction.date}
          </span>
        </div>
        <ItemActions ariaLabel={`More options for ${transaction.concept}`}>
          <DropdownMenuItem onSelect={() => setIsEditOpen(true)}>
            Edit Transaction
          </DropdownMenuItem>
        </ItemActions>
      </div>
      <EditTransactionDialog
        transaction={transaction}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
      />
    </li>
  )
}

function TransactionRow({
  transaction,
  budgets,
  isPending,
  onBudgetChange,
}: TransactionItemProps) {
  const [isEditOpen, setIsEditOpen] = useState(false)

  return (
    <TableRow>
      <TableCell className={DESKTOP_TABLE_CELL}>
        <div className="flex items-center gap-3">
          <ContactAvatar
            name={transaction.name}
            initials={transaction.contactInitials}
            color={transaction.contactColor}
            avatarUrl={transaction.avatarUrl}
            className="shrink-0"
          />
          <span className="text-foreground font-bold whitespace-nowrap">
            {transaction.name}
          </span>
        </div>
      </TableCell>
      <TableCell
        className={cn(
          DESKTOP_TABLE_CELL,
          "text-muted-foreground whitespace-normal",
        )}
      >
        <div className="flex flex-col items-start gap-1">
          <span className="whitespace-nowrap">{transaction.concept}</span>
          {transaction.paymentMethod !== "bank_account" ? (
            <Badge variant="secondary">{transaction.paymentMethodLabel}</Badge>
          ) : null}
        </div>
      </TableCell>
      <TableCell className={cn(DESKTOP_TABLE_CELL, "text-muted-foreground")}>
        {transaction.category}
      </TableCell>
      <TableCell className={DESKTOP_TABLE_CELL}>
        <BudgetAssignmentSelect
          transaction={transaction}
          budgets={budgets}
          isPending={isPending}
          onBudgetChange={onBudgetChange}
        />
      </TableCell>
      <TableCell className={cn(DESKTOP_TABLE_CELL, "text-muted-foreground")}>
        {transaction.date}
      </TableCell>
      <TableCell
        className={cn(
          DESKTOP_STICKY_AMOUNT_CELL,
          "font-bold tabular-nums",
          transactionAmountClassName(transaction.amount),
        )}
      >
        <MoneyAmount amount={transaction.amount} variant="signed" />
      </TableCell>
      <TableCell className={cn(DESKTOP_STICKY_ACTIONS_CELL, "align-middle")}>
        <div className="flex justify-end">
          <ItemActions ariaLabel={`More options for ${transaction.concept}`}>
            <DropdownMenuItem onSelect={() => setIsEditOpen(true)}>
              Edit Transaction
            </DropdownMenuItem>
          </ItemActions>
        </div>
        <EditTransactionDialog
          transaction={transaction}
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
        />
      </TableCell>
    </TableRow>
  )
}

interface BudgetAssignmentSelectProps {
  transaction: Transaction
  budgets: Budget[]
  isPending: boolean
  onBudgetChange: (transaction: Transaction, budgetId: string) => void
}

function BudgetAssignmentSelect({
  transaction,
  budgets,
  isPending,
  onBudgetChange,
}: BudgetAssignmentSelectProps) {
  const isExpense = transaction.amount < 0
  const eligibleBudgets = budgets

  if (!isExpense) {
    return <span className="text-muted-foreground text-xs">Not available</span>
  }

  if (eligibleBudgets.length === 0) {
    return (
      <span className="text-muted-foreground text-xs">No active budget</span>
    )
  }

  return (
    <Select
      value={transaction.budgetId ?? UNASSIGNED_BUDGET_VALUE}
      disabled={isPending}
      onValueChange={(budgetId) => onBudgetChange(transaction, budgetId)}
    >
      <SelectTrigger
        aria-label={`Budget assignment for ${transaction.name}`}
        className="h-9 w-48"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        <SelectItem value={UNASSIGNED_BUDGET_VALUE}>Unassigned</SelectItem>
        {eligibleBudgets.map((budget) => (
          <SelectItem key={budget.id} value={budget.id}>
            {budget.category}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
