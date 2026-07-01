"use client"

import Image from "next/image"
import { useState } from "react"

import { AuthStatusMessage } from "@/components/auth/auth-page-shell"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useFinance } from "@/hooks/use-finance"
import { cn } from "@/lib/utils"
import { formatSignedAmount } from "@/lib/format"
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
            budgets={budgets}
            isPending={pendingTransactionId === transaction.id}
            onBudgetChange={handleBudgetChange}
          />
        ))}
      </ul>

      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Recipient / Sender</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Budget</TableHead>
              <TableHead>Transaction Date</TableHead>
              <TableHead className="text-right">Amount</TableHead>
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

function MobileTransactionItem({
  transaction,
  budgets,
  isPending,
  onBudgetChange,
}: TransactionItemProps) {
  const isPositive = transaction.amount > 0

  return (
    <li className="flex flex-col gap-3 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Image
            src={transaction.avatarUrl}
            alt=""
            width={40}
            height={40}
            className="size-10 rounded-full object-cover"
          />
          <div className="flex flex-col">
            <span className="text-foreground text-sm font-bold">
              {transaction.name}
            </span>
            <span className="text-muted-foreground text-xs">
              {transaction.category}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span
            className={cn(
              "text-sm font-bold",
              isPositive ? "text-accent" : "text-foreground",
            )}
          >
            {formatSignedAmount(transaction.amount)}
          </span>
          <span className="text-muted-foreground text-xs">
            {transaction.date}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground text-xs">Budget</span>
        <BudgetAssignmentSelect
          transaction={transaction}
          budgets={budgets}
          isPending={isPending}
          onBudgetChange={onBudgetChange}
          compact
        />
      </div>
    </li>
  )
}

function TransactionRow({
  transaction,
  budgets,
  isPending,
  onBudgetChange,
}: TransactionItemProps) {
  const isPositive = transaction.amount > 0

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <Image
            src={transaction.avatarUrl}
            alt=""
            width={40}
            height={40}
            className="size-10 rounded-full object-cover"
          />
          <span className="text-foreground font-bold">{transaction.name}</span>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {transaction.category}
      </TableCell>
      <TableCell>
        <BudgetAssignmentSelect
          transaction={transaction}
          budgets={budgets}
          isPending={isPending}
          onBudgetChange={onBudgetChange}
        />
      </TableCell>
      <TableCell className="text-muted-foreground">
        {transaction.date}
      </TableCell>
      <TableCell
        className={cn(
          "text-right font-bold",
          isPositive ? "text-accent" : "text-foreground",
        )}
      >
        {formatSignedAmount(transaction.amount)}
      </TableCell>
    </TableRow>
  )
}

interface BudgetAssignmentSelectProps {
  transaction: Transaction
  budgets: Budget[]
  isPending: boolean
  compact?: boolean
  onBudgetChange: (transaction: Transaction, budgetId: string) => void
}

function BudgetAssignmentSelect({
  transaction,
  budgets,
  isPending,
  compact,
  onBudgetChange,
}: BudgetAssignmentSelectProps) {
  const isExpense = transaction.amount < 0

  if (!isExpense) {
    return <span className="text-muted-foreground text-xs">Not available</span>
  }

  if (budgets.length === 0) {
    return (
      <span className="text-muted-foreground text-xs">No active budgets</span>
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
        className={cn("h-9", compact ? "w-44" : "w-48")}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        <SelectItem value={UNASSIGNED_BUDGET_VALUE}>Unassigned</SelectItem>
        {budgets.map((budget) => (
          <SelectItem key={budget.id} value={budget.id}>
            {budget.category}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
