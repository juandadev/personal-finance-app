"use client"

import { useState } from "react"
import { MoreHorizontal } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Pot } from "@/lib/types"
import { formatCurrency } from "@/lib/format"
import { DeletePotDialog } from "./delete-pot-dialog"
import { EditPotDialog } from "./edit-pot-dialog"
import { PotProgressBar } from "./pot-progress-bar"
import { PotTransferDialog } from "./pot-transfer-dialog"

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
    <article className="bg-card rounded-xl p-5 shadow-sm md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="block size-4 rounded-full"
            style={{ backgroundColor: pot.color }}
          />
          <h3 className="text-card-foreground text-xl font-bold">{pot.name}</h3>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="text-muted-foreground hover:text-card-foreground focus-visible:ring-ring flex size-11 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none"
              aria-label={`More options for ${pot.name}`}
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
              className="focus:bg-background h-10 cursor-pointer rounded-md px-2 text-sm text-[#201F24]"
              onSelect={() => setIsEditOpen(true)}
            >
              Edit Pot
            </DropdownMenuItem>
            <DropdownMenuItem
              className="focus:bg-background h-10 cursor-pointer rounded-md px-2 text-sm text-[#C94736] focus:text-[#C94736]"
              onSelect={() => setIsDeleteOpen(true)}
            >
              Delete Pot
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Amount */}
      <div className="mt-6 flex items-center justify-between">
        <span className="text-muted-foreground text-sm">Total Saved</span>
        <span className="text-card-foreground text-3xl font-bold">
          {formatCurrency(pot.amount, { forceDecimals: true })}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mt-4">
        <PotProgressBar percentage={percentage} color={pot.color} />
      </div>

      {/* Progress Info */}
      <div className="text-muted-foreground mt-3 flex items-center justify-between text-xs">
        <span>{percentage.toFixed(percentage < 10 ? 2 : 1)}%</span>
        <span>Target of {formatCurrency(pot.target)}</span>
      </div>

      {/* Action Buttons */}
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
      <EditPotDialog pot={pot} open={isEditOpen} onOpenChange={setIsEditOpen} />
      <DeletePotDialog
        pot={pot}
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
      />
    </article>
  )
}
