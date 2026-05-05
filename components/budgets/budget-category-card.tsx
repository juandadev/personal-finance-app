"use client"

import { useState } from "react"
import Link from "next/link"
import CaretRightIcon from "@/components/icons/CaretRightIcon"
import { MoreHorizontal } from "lucide-react"
import { Card } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatCurrency } from "@/lib/format"
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
    <Card asChild>
      <section>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className={cn(
                "size-4 rounded-full",
                themeColorClasses[budget.color].bg,
              )}
            />
            <h2 className="text-foreground text-xl font-bold">
              {budget.category}
            </h2>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground focus-visible:ring-ring flex size-11 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none"
                aria-label={`More options for ${budget.category}`}
              >
                <MoreHorizontal className="size-5" aria-hidden />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={8}
              className="w-33.5 rounded-lg border-none bg-white p-3 shadow-[0_16px_32px_rgba(0,0,0,0.18)]"
            >
              <DropdownMenuItem
                className="focus:bg-background text-finance-navy h-10 cursor-pointer rounded-md px-2 text-sm"
                onSelect={() => setIsEditOpen(true)}
              >
                Edit Budget
              </DropdownMenuItem>
              <DropdownMenuItem
                className="focus:bg-background text-destructive focus:text-destructive h-10 cursor-pointer rounded-md px-2 text-sm"
                onSelect={() => setIsDeleteOpen(true)}
              >
                Delete Budget
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

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

        <div className="mt-4 flex">
          <div
            className={cn(
              "flex-1 border-l-4 pl-3",
              themeColorClasses[budget.color].border,
            )}
          >
            <p className="text-muted-foreground text-xs">Spent</p>
            <p className="text-foreground mt-1 text-sm font-bold">
              {formatCurrency(budget.spent, { forceDecimals: true })}
            </p>
          </div>
          <div className="border-background flex-1 border-l-4 pl-3">
            <p className="text-muted-foreground text-xs">Remaining</p>
            <p className="text-foreground mt-1 text-sm font-bold">
              {formatCurrency(remaining, { forceDecimals: true })}
            </p>
          </div>
        </div>

        <div className="bg-background mt-6 rounded-lg p-4 md:p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-foreground font-bold">Latest Spending</h3>
            <Link
              href={`/transactions?category=${encodeURIComponent(budget.category)}`}
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm transition-colors"
            >
              See All
              <CaretRightIcon className="size-2" aria-hidden />
            </Link>
          </div>
          <ul className="divide-muted-foreground/10 mt-2 divide-y">
            {latestTransactions.map((transaction) => (
              <li key={transaction.id}>
                <LatestSpendingItem transaction={transaction} />
              </li>
            ))}
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
      </section>
    </Card>
  )
}
