"use client"

import { useState } from "react"
import { ItemActions } from "@/components/actions"
import { Card, CardAction, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import type { Pot } from "@/lib/types"
import { formatPotDueDateRemaining } from "@/lib/finance/pot-due-date"
import { formatCurrency } from "@/lib/format"
import { themeColorClasses } from "@/lib/theme-colors"
import { cn } from "@/lib/utils"
import { DeletePotDialog } from "./delete-pot-dialog"
import { EditPotDialog } from "./edit-pot-dialog"
import { PotProgressBar } from "./pot-progress-bar"
import { PotTransferDialog } from "./pot-transfer-dialog"
import { Button } from "@/components/ui/button"

interface PotCardProps {
  pot: Pot
}

export function PotCard({ pot }: PotCardProps) {
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isAddMoneyOpen, setIsAddMoneyOpen] = useState(false)
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false)
  const percentage = (pot.amount / pot.target) * 100
  const dueDateLabel = formatPotDueDateRemaining(pot.dueDate)
  const dueDateDuration = dueDateLabel?.replace("Due in ", "")

  return (
    <Card asChild padding="compact">
      <article>
        <CardHeader>
          <CardTitle>
            <span
              aria-hidden
              className={cn(
                "block size-4 rounded-full",
                themeColorClasses[pot.color].bg,
              )}
            />
            <h3>{pot.name}</h3>
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
            {formatCurrency(pot.amount, { forceDecimals: true })}
          </span>
        </div>

        <div className="mt-4">
          <PotProgressBar percentage={percentage} color={pot.color} />
        </div>

        <div className="text-muted-foreground mt-3 flex items-center justify-between text-xs">
          <span>{percentage.toFixed(percentage < 10 ? 2 : 1)}%</span>
          <span>Target of {formatCurrency(pot.target)}</span>
        </div>

        {dueDateLabel ? (
          <p className="text-muted-foreground mt-2 text-xs">
            Due in{" "}
            <strong className="text-foreground font-bold">
              {dueDateDuration}
            </strong>
          </p>
        ) : null}

        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="surface"
            size="card-action"
            onClick={() => setIsAddMoneyOpen(true)}
          >
            Add Money
          </Button>
          <Button
            type="button"
            variant="surface"
            size="card-action"
            onClick={() => setIsWithdrawOpen(true)}
          >
            Withdraw
          </Button>
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
