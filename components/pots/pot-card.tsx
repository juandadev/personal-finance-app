"use client"

import { useState } from "react"
import { Card, CardAction, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Pot } from "@/lib/types"
import { formatCurrency } from "@/lib/format"
import { themeColorClasses } from "@/lib/theme-colors"
import { cn } from "@/lib/utils"
import { DeletePotDialog } from "./delete-pot-dialog"
import { EditPotDialog } from "./edit-pot-dialog"
import { PotProgressBar } from "./pot-progress-bar"
import { PotTransferDialog } from "./pot-transfer-dialog"
import { Button } from "@/components/ui/button"
import EllipsisIcon from "@/components/icons/EllipsisIcon"

interface PotCardProps {
  pot: Pot
}

export function PotCard({ pot }: PotCardProps) {
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isAddMoneyOpen, setIsAddMoneyOpen] = useState(false)
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false)
  const percentage = (pot.amount / pot.target) * 100

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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  aria-label={`More options for ${pot.name}`}
                >
                  <EllipsisIcon className="size-4" aria-hidden />
                </Button>
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
                  Edit Pot
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="focus:bg-background text-destructive focus:text-destructive h-10 cursor-pointer rounded-md px-2 text-sm"
                  onSelect={() => setIsDeleteOpen(true)}
                >
                  Delete Pot
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardAction>
        </CardHeader>

        <div className="mt-6 flex items-center justify-between">
          <span className="text-muted-foreground text-sm">Total Saved</span>
          <span className="text-card-foreground text-3xl font-bold">
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

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            className="bg-background text-card-foreground hover:bg-muted rounded-lg px-4 py-3 text-sm font-bold transition-colors"
            onClick={() => setIsAddMoneyOpen(true)}
          >
            + Add Money
          </button>
          <button
            type="button"
            className="bg-background text-card-foreground hover:bg-muted rounded-lg px-4 py-3 text-sm font-bold transition-colors"
            onClick={() => setIsWithdrawOpen(true)}
          >
            Withdraw
          </button>
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
