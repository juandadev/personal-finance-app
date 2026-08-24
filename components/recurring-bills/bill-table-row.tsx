"use client"

import { useState } from "react"
import {
  CheckCircleIcon,
  CreditCardIcon,
  MinusCircleIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react"
import Link from "next/link"

import { ItemActions } from "@/components/actions"
import { ContactAvatar } from "@/components/contact-avatar"
import { MoneyAmount } from "@/components/money-amount"
import { PrivacyValue } from "@/components/privacy-value"
import {
  ArchiveBillDialog,
  InactiveBillDialog,
} from "@/components/recurring-bills/inactive-bill-dialog"
import { UndoScheduledEndDialog } from "@/components/recurring-bills/undo-scheduled-end-dialog"
import { ResumeBillDialog } from "@/components/recurring-bills/resume-bill-dialog"
import { EditBillDialog } from "@/components/recurring-bills/bill-dialog"
import { PayBillDialog } from "@/components/recurring-bills/pay-bill-dialog"
import { SkipBillOccurrenceDialog } from "@/components/recurring-bills/skip-bill-occurrence-dialog"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { TableCell, TableRow } from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useFinance } from "@/hooks/use-finance"
import { formatBillScheduleShortDate, formatDisplayDate } from "@/lib/format"
import { themeColorClasses } from "@/lib/theme-colors"
import type { BillStatus, RecurringBill } from "@/lib/types"
import { cn } from "@/lib/utils"

const FULL_DUE_DATE_FORMAT = "EEEE, d MMM, yyyy"

interface BillTableRowProps {
  bill: RecurringBill
}

const statusLabels: Record<BillStatus, string> = {
  paid: "Paid",
  skipped: "Skipped",
  upcoming: "Upcoming",
  "due-soon": "Due Soon",
  "due-today": "Due Today",
  overdue: "Overdue",
}

const warningStatuses: BillStatus[] = ["due-soon", "due-today"]

function isWarning(status: BillStatus) {
  return warningStatuses.includes(status)
}

function statusClassName(status: BillStatus) {
  if (status === "paid") {
    return "text-accent"
  }

  if (isWarning(status)) {
    return "text-warning"
  }

  if (status === "overdue") {
    return "text-destructive"
  }

  return "text-muted-foreground"
}

function amountClassName(status: BillStatus) {
  if (isWarning(status)) {
    return "text-warning"
  }

  return status === "overdue" ? "text-destructive" : "text-foreground"
}

function scheduleLabel(bill: RecurringBill) {
  if (bill.frequency === "one_time") {
    return "One-Time"
  }

  if (bill.totalPayments && bill.currentOccurrence) {
    return `Payment ${bill.currentOccurrence.sequence} of ${bill.totalPayments}`
  }

  return bill.frequency === "yearly" ? "Yearly" : "Monthly"
}

function nextDueDate(bill: RecurringBill) {
  return bill.currentOccurrence?.dueDate ?? bill.firstDueDate
}

function BillScheduleShortDate({ bill }: { bill: RecurringBill }) {
  const shortDate = formatBillScheduleShortDate(
    bill.firstDueDate,
    bill.frequency,
  )
  const fullDate = formatDisplayDate(nextDueDate(bill), FULL_DUE_DATE_FORMAT)

  return (
    <TooltipProvider skipDelayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-default">{shortDate}</span>
        </TooltipTrigger>
        <TooltipContent side="top">{fullDate}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function StatusIcon({
  status,
  iconClassName,
}: {
  status: BillStatus
  iconClassName?: string
}) {
  if (status === "paid") {
    return (
      <CheckCircleIcon
        weight="fill"
        className={cn("text-accent size-4", iconClassName)}
        aria-label={statusLabels.paid}
      />
    )
  }

  if (status === "skipped") {
    return (
      <MinusCircleIcon
        weight="fill"
        className={cn("text-muted-foreground size-4", iconClassName)}
        aria-label={statusLabels.skipped}
      />
    )
  }

  if (isWarning(status) || status === "overdue") {
    return (
      <WarningCircleIcon
        weight="fill"
        className={cn(statusClassName(status), "size-4", iconClassName)}
        aria-label={statusLabels[status]}
      />
    )
  }

  return <span className="sr-only">{statusLabels[status]}</span>
}

function StatusIndicator({
  bill,
  iconClassName,
}: {
  bill: RecurringBill
  iconClassName?: string
}) {
  const status = bill.status
  const endingLabel = endingBillLabel(bill)

  return (
    <span className="flex flex-col gap-0.5">
      <span className="flex items-center gap-1.5">
        <span className={cn("text-sm", statusClassName(status))}>
          {scheduleLabel(bill)} - <BillScheduleShortDate bill={bill} /> ·{" "}
          <span className="font-semibold">{statusLabels[status]}</span>
        </span>
        <StatusIcon status={status} iconClassName={iconClassName} />
      </span>
      {endingLabel ? (
        <span className="text-muted-foreground text-xs font-semibold">
          {endingLabel}
        </span>
      ) : null}
    </span>
  )
}

function MobileDueDateIndicator({ bill }: { bill: RecurringBill }) {
  const status = bill.status
  const endingLabel = endingBillLabel(bill)
  const frequency =
    bill.frequency === "yearly"
      ? "Yearly"
      : bill.frequency === "one_time"
        ? "One-Time"
        : "Monthly"

  return (
    <span className="flex flex-col gap-0.5">
      <span
        className={cn(
          "flex items-center gap-1.5 text-xs",
          statusClassName(status),
        )}
      >
        <span className="truncate">
          {frequency} - <BillScheduleShortDate bill={bill} />
        </span>
        <StatusIcon status={status} iconClassName="size-3.5 shrink-0" />
      </span>
      {endingLabel ? (
        <span className="text-muted-foreground text-xs font-semibold">
          {endingLabel}
        </span>
      ) : null}
    </span>
  )
}

function BillCreditCardIcon({ creditCardId }: { creditCardId: string }) {
  const { creditCards } = useFinance()
  const card = creditCards.find((creditCard) => creditCard.id === creditCardId)

  const link = (
    <Link
      href={`/credit-cards/${creditCardId}`}
      className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex shrink-0 items-center gap-0.5 rounded-sm focus-visible:ring-2 focus-visible:outline-none"
      aria-label="View credit card details"
    >
      <CreditCardIcon weight="fill" className="size-3.5" aria-hidden />
      {card ? (
        <span
          aria-hidden
          className={cn(
            "size-1.5 rounded-full",
            themeColorClasses[card.color].bg,
          )}
        />
      ) : null}
    </Link>
  )

  if (!card) {
    return link
  }

  return (
    <TooltipProvider skipDelayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="top">
          <PrivacyValue hiddenLabel="Card details hidden. Turn off privacy mode to show it.">
            {card.nickname} •••• {card.lastFour}
          </PrivacyValue>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function BillIdentity({
  bill,
  showCreditCardIcon = true,
}: {
  bill: RecurringBill
  showCreditCardIcon?: boolean
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <ContactAvatar
        name={bill.name}
        initials={bill.contactInitials}
        color={bill.contactColor}
        avatarUrl={bill.avatarUrl || undefined}
        className={cn("shrink-0", isInactiveBill(bill) && "opacity-60")}
      />
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "truncate font-bold",
              bill.archivedAt || bill.pausedAt
                ? "text-muted-foreground"
                : "text-foreground",
            )}
          >
            {bill.concept}
          </span>
          {showCreditCardIcon && bill.creditCardId ? (
            <BillCreditCardIcon creditCardId={bill.creditCardId} />
          ) : null}
        </div>
        <span className="text-muted-foreground block truncate text-xs font-semibold">
          {bill.name}
        </span>
      </div>
    </div>
  )
}

function isEndingBill(bill: RecurringBill) {
  return Boolean(
    bill.scheduledEndDate &&
    bill.scheduledEndMode &&
    !bill.archivedAt &&
    !bill.pausedAt,
  )
}

function endingBillLabel(bill: RecurringBill) {
  if (!bill.scheduledEndDate || !bill.scheduledEndMode) {
    return null
  }

  const formattedDate = formatDisplayDate(bill.scheduledEndDate, "d MMM, yyyy")

  return bill.scheduledEndMode === "pause"
    ? `Pauses on ${formattedDate}`
    : `Cancels on ${formattedDate}`
}

function isInactiveBill(bill: RecurringBill) {
  return Boolean(bill.archivedAt || bill.pausedAt)
}

function BillActions({
  bill,
  variant = "desktop",
}: {
  bill: RecurringBill
  variant?: "desktop" | "mobile"
}) {
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isPauseOpen, setIsPauseOpen] = useState(false)
  const [isArchiveOpen, setIsArchiveOpen] = useState(false)
  const [isResumeOpen, setIsResumeOpen] = useState(false)
  const [isPayOpen, setIsPayOpen] = useState(false)
  const [isSkipOpen, setIsSkipOpen] = useState(false)
  const [isUndoOpen, setIsUndoOpen] = useState(false)
  const occurrence = bill.currentOccurrence
  const isActive = !bill.archivedAt && !bill.pausedAt
  const isEnding = isEndingBill(bill)
  const isPaused = Boolean(bill.pausedAt) && !bill.archivedAt
  const isActionable =
    isActive &&
    occurrence &&
    occurrence.status !== "paid" &&
    occurrence.status !== "skipped"
  // Card-assigned bills settle through the card's statement payment.
  const canSettleManually = isActionable && !bill.creditCardId
  const collapseSettleActions = variant === "mobile"

  return (
    <>
      {canSettleManually && occurrence && !collapseSettleActions ? (
        <>
          <SkipBillOccurrenceDialog bill={bill} occurrence={occurrence} />
          <PayBillDialog bill={bill} occurrence={occurrence} />
        </>
      ) : null}
      {isActive ? (
        <ItemActions ariaLabel={`More options for ${bill.concept}`}>
          {canSettleManually && collapseSettleActions ? (
            <>
              <DropdownMenuItem onSelect={() => setIsPayOpen(true)}>
                Pay Bill
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setIsSkipOpen(true)}>
                Skip
              </DropdownMenuItem>
            </>
          ) : null}
          {isEnding ? (
            <DropdownMenuItem onSelect={() => setIsUndoOpen(true)}>
              Undo {bill.scheduledEndMode === "pause" ? "Pause" : "Cancel"}
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem onSelect={() => setIsEditOpen(true)}>
            Edit Bill
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setIsPauseOpen(true)}>
            {isEnding && bill.scheduledEndMode === "pause"
              ? "Update Pause"
              : "Pause Bill"}
          </DropdownMenuItem>
          {bill.hasPayments ? (
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => setIsArchiveOpen(true)}
            >
              {isEnding && bill.scheduledEndMode === "archive"
                ? "Update Cancel"
                : "Cancel Bill"}
            </DropdownMenuItem>
          ) : null}
        </ItemActions>
      ) : null}
      {isPaused ? (
        <ItemActions ariaLabel={`More options for ${bill.concept}`}>
          <DropdownMenuItem onSelect={() => setIsResumeOpen(true)}>
            Resume Bill
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setIsArchiveOpen(true)}
          >
            Cancel Bill
          </DropdownMenuItem>
        </ItemActions>
      ) : null}
      {canSettleManually && occurrence && collapseSettleActions ? (
        <>
          <PayBillDialog
            bill={bill}
            occurrence={occurrence}
            open={isPayOpen}
            onOpenChange={setIsPayOpen}
          />
          <SkipBillOccurrenceDialog
            bill={bill}
            occurrence={occurrence}
            open={isSkipOpen}
            onOpenChange={setIsSkipOpen}
          />
        </>
      ) : null}
      {!bill.archivedAt ? (
        <>
          <EditBillDialog
            bill={bill}
            open={isEditOpen}
            onOpenChange={setIsEditOpen}
          />
          <InactiveBillDialog
            bill={bill}
            mode="pause"
            open={isPauseOpen}
            onOpenChange={setIsPauseOpen}
          />
          <ArchiveBillDialog
            bill={bill}
            open={isArchiveOpen}
            onOpenChange={setIsArchiveOpen}
          />
          {isEnding ? (
            <UndoScheduledEndDialog
              bill={bill}
              open={isUndoOpen}
              onOpenChange={setIsUndoOpen}
            />
          ) : null}
        </>
      ) : null}
      {isPaused ? (
        <>
          <ResumeBillDialog
            bill={bill}
            open={isResumeOpen}
            onOpenChange={setIsResumeOpen}
          />
          <ArchiveBillDialog
            bill={bill}
            open={isArchiveOpen}
            onOpenChange={setIsArchiveOpen}
          />
        </>
      ) : null}
    </>
  )
}

export function BillTableRow({ bill }: BillTableRowProps) {
  return (
    <TableRow className={cn(isInactiveBill(bill) && "opacity-70")}>
      <TableCell>
        <BillIdentity bill={bill} />
      </TableCell>
      <TableCell className="px-8">
        <StatusIndicator bill={bill} />
      </TableCell>
      <TableCell
        className={cn("text-right font-bold", amountClassName(bill.status))}
      >
        <MoneyAmount
          amount={bill.currentOccurrence?.amount ?? bill.amount}
          forceDecimals
        />
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <BillActions bill={bill} />
        </div>
      </TableCell>
    </TableRow>
  )
}

export function MobileBillRow({ bill }: BillTableRowProps) {
  return (
    <li
      className={cn(
        "flex items-start gap-2 py-4",
        isInactiveBill(bill) && "opacity-70",
      )}
    >
      <ContactAvatar
        name={bill.name}
        initials={bill.contactInitials}
        color={bill.contactColor}
        avatarUrl={bill.avatarUrl || undefined}
        className={cn("shrink-0", isInactiveBill(bill) && "opacity-60")}
      />
      <div className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate text-sm font-bold",
            isInactiveBill(bill) ? "text-muted-foreground" : "text-foreground",
          )}
        >
          {bill.concept}
        </span>
        <span className="text-muted-foreground block truncate text-xs font-semibold">
          {bill.name}
        </span>
        <div className="mt-1">
          <MobileDueDateIndicator bill={bill} />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <span
          className={cn(
            "text-sm font-bold tabular-nums",
            amountClassName(bill.status),
          )}
        >
          <MoneyAmount
            amount={bill.currentOccurrence?.amount ?? bill.amount}
            forceDecimals
          />
        </span>
        <BillActions bill={bill} variant="mobile" />
      </div>
    </li>
  )
}
