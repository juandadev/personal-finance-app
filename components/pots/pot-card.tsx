"use client"

import { ArrowSquareOutIcon, StarIcon } from "@phosphor-icons/react"
import { motion } from "motion/react"
import { useState } from "react"
import { ItemActions } from "@/components/actions"
import { MoneyAmount } from "@/components/money-amount"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { formatPotDueDateRemaining } from "@/lib/finance/pot-due-date"
import { themeColorClasses } from "@/lib/theme-colors"
import type { Pot } from "@/lib/types"
import { cn } from "@/lib/utils"
import { CompletePotDialog } from "./complete-pot-dialog"
import { DeletePotDialog } from "./delete-pot-dialog"
import { EditPotDialog } from "./edit-pot-dialog"
import { PotProgressBar } from "./pot-progress-bar"
import { PotTransferDialog } from "./pot-transfer-dialog"
import styles from "./pots-layout.module.css"

interface PotCardProps {
  pot: Pot
  percentage: number
  animateLayout: boolean
  highlighted: boolean
  onToggleHighlight?: () => void
}

export function PotCard({
  pot,
  percentage,
  animateLayout,
  highlighted,
  onToggleHighlight,
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
      className="flex h-full flex-col justify-between gap-6"
    >
      <motion.article layout={animateLayout && "position"}>
        <CardHeader>
          <CardTitle>
            <span
              aria-hidden
              className={cn(
                "block size-4 shrink-0 rounded-full",
                themeColorClasses[pot.color].bg,
                highlighted && "ring-accent-foreground ring-1",
              )}
            />
            <h3 className="min-w-0 wrap-break-word">{pot.name}</h3>
          </CardTitle>
          <CardAction className="shrink-0 gap-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-lg"
                  className={cn(
                    "aria-pressed:text-card-foreground size-11",
                    styles.highlightButton,
                  )}
                  aria-label={`Highlight ${pot.name}`}
                  aria-pressed={highlighted}
                  onClick={onToggleHighlight}
                >
                  <StarIcon
                    className="size-4"
                    weight={highlighted ? "fill" : "regular"}
                    aria-hidden
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {highlighted ? "Remove highlight" : "Highlight pot"}
              </TooltipContent>
            </Tooltip>
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

        <div className="flex flex-col">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">Total Saved</span>
            <span className="text-foreground text-3xl font-bold">
              <MoneyAmount amount={pot.amount} forceDecimals />
            </span>
          </div>

          <div className="mt-4">
            <PotProgressBar
              percentage={percentage}
              color={pot.color}
              highlighted={highlighted}
            />
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

          <div
            className={cn(
              "grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 pt-6",
              styles.cardActions,
            )}
          >
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
      </motion.article>
    </Card>
  )
}
