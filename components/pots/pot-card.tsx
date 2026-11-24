"use client"

import { ArrowSquareOutIcon } from "@phosphor-icons/react"
import { useState } from "react"
import { ItemActions } from "@/components/actions"
import { MoneyAmount } from "@/components/money-amount"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { formatPotDueDateRemaining } from "@/lib/finance/pot-due-date"
import { themeColorClasses } from "@/lib/theme-colors"
import type { Pot } from "@/lib/types"
import { cn } from "@/lib/utils"
import { CompletePotDialog } from "./complete-pot-dialog"
import { DeletePotDialog } from "./delete-pot-dialog"
import { EditPotDialog } from "./edit-pot-dialog"
import { PotProgressBar } from "./pot-progress-bar"
import { PotTransferDialog } from "./pot-transfer-dialog"

interface PotCardProps {
  pot: Pot
  percentage: number
  isNearGoal: boolean
  className?: string
}

export function PotCard({
  pot,
  percentage,
  isNearGoal,
  className,
}: PotCardProps) {
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isAddMoneyOpen, setIsAddMoneyOpen] = useState(false)
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false)
  const dueDateLabel = formatPotDueDateRemaining(pot.dueDate)
  const dueDateDuration = dueDateLabel?.replace("Due in ", "")

  return (
    <Card
      asChild
      padding="compact"
      className={cn(
        "flex flex-col",
        isNearGoal &&
          "ring-accent/30 bg-[color-mix(in_srgb,var(--color-accent)_8%,var(--color-card))] ring-1 ring-inset",
        className,
      )}
    >
      <article>
        <CardHeader>
          <CardTitle>
            <span
              aria-hidden
              className={cn(
                "block size-4 shrink-0 rounded-full",
                themeColorClasses[pot.color].bg,
              )}
            />
            <h3 className="min-w-0 wrap-break-word">{pot.name}</h3>
          </CardTitle>
          <CardAction>
            <ItemActions ariaLabel={`More options for ${pot.name}`}>
              <DropdownMenuItem onSelect={() => setIsEditOpen(true)}>
                Edit Pot
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => setIsDeleteOpen(true)}
              >
                Delete Pot
              </DropdownMenuItem>
            </ItemActions>
          </CardAction>
        </CardHeader>

        <div className="mt-6 flex items-center justify-between">
          <span className="text-muted-foreground text-sm">Total Saved</span>
          <span className="text-foreground text-3xl font-bold">
            <MoneyAmount amount={pot.amount} forceDecimals />
          </span>
        </div>

        <div className="mt-4">
          <PotProgressBar percentage={percentage} color={pot.color} />
        </div>

        <div className="text-muted-foreground mt-3 flex items-center justify-between text-xs">
          <span>{percentage.toFixed(percentage < 10 ? 2 : 1)}%</span>
          <span>
            Target of <MoneyAmount amount={pot.target} />
          </span>
        </div>

        {dueDateLabel ? (
          <p className="text-muted-foreground mt-2 text-xs">
            Due in{" "}
            <strong className="text-foreground font-bold">
              {dueDateDuration}
            </strong>
          </p>
        ) : null}

        {pot.productUrl ? (
          <Button
            asChild
            variant="link"
            size="text-link"
            className="mt-2 min-h-9 gap-1.5 self-start"
          >
            <a
              href={pot.productUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={`View product for ${pot.name} (opens in a new tab)`}
            >
              View product
              <ArrowSquareOutIcon className="size-4" aria-hidden />
            </a>
          </Button>
        ) : null}

        <div className="mt-auto grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 pt-6">
          <Button
            type="button"
            variant="surface"
            size="card-action"
            className="min-h-11 px-2"
            onClick={() => setIsAddMoneyOpen(true)}
          >
            Add Money
          </Button>
          <Button
            type="button"
            variant="surface"
            size="card-action"
            className="min-h-11 px-2"
            onClick={() => setIsWithdrawOpen(true)}
          >
            Withdraw
          </Button>
          <CompletePotDialog pot={pot} />
        </div>
        <PotTransferDialog
          pot={pot}
          mode="add"
          open={isAddMoneyOpen}
          onOpenChange={setIsAddMoneyOpen}
        />
        <PotTransferDialog
          pot={pot}
          mode="withdraw"
          open={isWithdrawOpen}
          onOpenChange={setIsWithdrawOpen}
        />
        <EditPotDialog
          pot={pot}
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
        />
        <DeletePotDialog
          pot={pot}
          open={isDeleteOpen}
          onOpenChange={setIsDeleteOpen}
        />
      </article>
    </Card>
  )
}
