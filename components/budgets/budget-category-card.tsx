"use client"

import { useState } from "react"
import Link from "next/link"
import { ItemActions } from "@/components/actions"
import CaretRightIcon from "@/components/icons/CaretRightIcon"
import {
  Card,
  CardAction,
  CardHeader,
  CardTitle,
  cardActionLinkClasses,
} from "@/components/ui/card"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { formatCurrency, formatBudgetPercentage } from "@/lib/format"
import { themeColorClasses } from "@/lib/theme-colors"
import type { Budget, Transaction } from "@/lib/types"
import { cn } from "@/lib/utils"
import { BudgetProgressBar } from "./budget-progress-bar"
import { DeleteBudgetDialog } from "./delete-budget-dialog"
import { EditBudgetDialog } from "./edit-budget-dialog"
import { LatestSpendingItem } from "./latest-spending-item"

interface BudgetCategoryCardProps {
  budget: Budget
  transactions: Transaction[]
}

export function BudgetCategoryCard({
  budget,
  transactions,
}: BudgetCategoryCardProps) {
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const remaining = Math.max(budget.maximum - budget.spent, 0)
  const latestTransactions = transactions.slice(0, 3)

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span
            aria-hidden
            className={cn(
              "size-4 rounded-full",
              themeColorClasses[budget.color].bg,
            )}
          />
          <h2>{budget.category}</h2>
        </CardTitle>
        <CardAction>
          <ItemActions ariaLabel={`More options for ${budget.category}`}>
            <DropdownMenuItem onSelect={() => setIsEditOpen(true)}>
              Edit Budget
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => setIsDeleteOpen(true)}
            >
              Delete Budget
            </DropdownMenuItem>
          </ItemActions>
        </CardAction>
      </CardHeader>

      <p className="text-muted-foreground mt-4 text-sm">
        Maximum of {formatCurrency(budget.maximum, { forceDecimals: true })}
      </p>

      <div className="mt-4">
        <BudgetProgressBar
          spent={budget.spent}
          maximum={budget.maximum}
          color={budget.color}
        />
      </div>

      <div className="text-muted-foreground mt-3 flex items-center justify-between text-xs">
        <span>
          <strong>
            {formatBudgetPercentage(budget.spent, budget.maximum)}
          </strong>{" "}
          spent
        </span>
      </div>

      <div className="mt-4 flex">
        <div className="relative flex flex-1 gap-4">
          <div
            aria-hidden="true"
            className={cn(
              "h-full w-1 rounded-full",
              themeColorClasses[budget.color].bg,
            )}
          />
          <div>
            <p className="text-muted-foreground text-xs">Spent</p>
            <p className="text-foreground mt-1 text-sm font-bold">
              {formatCurrency(budget.spent, { forceDecimals: true })}
            </p>
          </div>
        </div>
        <div className="relative flex flex-1 gap-4">
          <div
            aria-hidden="true"
            className="bg-background h-full w-1 rounded-full"
          />
          <div>
            <p className="text-muted-foreground text-xs">Free</p>
            <p className="text-foreground mt-1 text-sm font-bold">
              {formatCurrency(remaining, { forceDecimals: true })}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-background mt-6 rounded-lg p-4 md:p-5">
        <CardHeader>
          <CardTitle size="sm">
            <h3>Latest Spending</h3>
          </CardTitle>
          <CardAction>
            <Link
              href={`/transactions?budgetId=${encodeURIComponent(budget.id)}`}
              className={cardActionLinkClasses}
            >
              See All
              <CaretRightIcon className="size-2" aria-hidden />
            </Link>
          </CardAction>
        </CardHeader>
        <ul className="divide-muted-foreground/10 mt-2 divide-y">
          {latestTransactions.length > 0 ? (
            latestTransactions.map((transaction) => (
              <LatestSpendingItem
                key={transaction.id}
                transaction={transaction}
              />
            ))
          ) : (
            <li className="py-3 first:pt-0 last:pb-0">
              <div className="border-border/80 bg-card/70 rounded-lg border border-dashed p-4">
                <p className="text-foreground text-sm font-bold">
                  No spending yet
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Assigned transactions will appear here.
                </p>
              </div>
            </li>
          )}
        </ul>
      </div>
      <EditBudgetDialog
        budget={budget}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
      />
      <DeleteBudgetDialog
        budget={budget}
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
      />
    </Card>
  )
}
