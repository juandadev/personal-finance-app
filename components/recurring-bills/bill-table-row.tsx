"use client"

import { useState } from "react"
import {
  CheckCircleIcon,
  CreditCardIcon,
  MinusCircleIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react"

import { ItemActions } from "@/components/actions"
import { ContactAvatar } from "@/components/contact-avatar"
import { MoneyAmount } from "@/components/money-amount"
import { ArchiveBillDialog } from "@/components/recurring-bills/archive-bill-dialog"
import { EditBillDialog } from "@/components/recurring-bills/bill-dialog"
import { PayBillDialog } from "@/components/recurring-bills/pay-bill-dialog"
import { SkipBillOccurrenceDialog } from "@/components/recurring-bills/skip-bill-occurrence-dialog"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { TableCell, TableRow } from "@/components/ui/table"
import { formatBillScheduleShortDate } from "@/lib/format"
import type { BillStatus, RecurringBill } from "@/lib/types"
import { cn } from "@/lib/utils"

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

function mobileDueDateLabel(bill: RecurringBill) {
  const shortDate = formatBillScheduleShortDate(
    bill.firstDueDate,
    bill.frequency,
  )
  const frequency =
    bill.frequency === "yearly"
      ? "Yearly"
      : bill.frequency === "one_time"
        ? "One-Time"
        : "Monthly"

  return `${frequency} - ${shortDate}`
}

function dueDateLabel(bill: RecurringBill) {
  const shortDate = formatBillScheduleShortDate(
    bill.firstDueDate,
    bill.frequency,
  )

  return `${scheduleLabel(bill)} - ${shortDate}`
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

  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("text-sm", statusClassName(status))}>
        {dueDateLabel(bill)} ·{" "}
        <span className="font-semibold">{statusLabels[status]}</span>
      </span>
      <StatusIcon status={status} iconClassName={iconClassName} />
    </span>
  )
}

function MobileDueDateIndicator({ bill }: { bill: RecurringBill }) {
  const status = bill.status

  return (
    <span
      className={cn(
        "flex items-center gap-1.5 text-xs",
        statusClassName(status),
      )}
    >
      <span className="truncate">{mobileDueDateLabel(bill)}</span>
      <StatusIcon status={status} iconClassName="size-3.5 shrink-0" />
    </span>
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
        className={cn("shrink-0", bill.archivedAt && "opacity-60")}
      />
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "truncate font-bold",
              bill.archivedAt ? "text-muted-foreground" : "text-foreground",
            )}
          >
            {bill.concept}
          </span>
          {showCreditCardIcon && bill.creditCardId ? (
            <CreditCardIcon
              weight="fill"
              className="text-muted-foreground size-3.5 shrink-0"
              aria-label="Charges to a card"
            />
          ) : null}
        </div>
        <span className="text-muted-foreground block truncate text-xs font-semibold">
          {bill.name}
        </span>
      </div>
    </div>
  )
}

function BillActions({
  bill,
  variant = "desktop",
}: {
  bill: RecurringBill
  variant?: "desktop" | "mobile"
}) {
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isArchiveOpen, setIsArchiveOpen] = useState(false)
  const [isPayOpen, setIsPayOpen] = useState(false)
  const [isSkipOpen, setIsSkipOpen] = useState(false)
  const occurrence = bill.currentOccurrence
  const isActionable =
    !bill.archivedAt &&
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
      {!bill.archivedAt ? (
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
          <DropdownMenuItem onSelect={() => setIsEditOpen(true)}>
            Edit Bill
          </DropdownMenuItem>
          {bill.hasPayments ? (
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => setIsArchiveOpen(true)}
            >
              Archive Bill
            </DropdownMenuItem>
          ) : null}
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
          {bill.hasPayments ? (
            <ArchiveBillDialog
              bill={bill}
              open={isArchiveOpen}
              onOpenChange={setIsArchiveOpen}
            />
          ) : null}
        </>
      ) : null}
    </>
  )
}

export function BillTableRow({ bill }: BillTableRowProps) {
  return (
    <TableRow className={cn(bill.archivedAt && "opacity-70")}>
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
        bill.archivedAt && "opacity-70",
      )}
    >
      <ContactAvatar
        name={bill.name}
        initials={bill.contactInitials}
        color={bill.contactColor}
        avatarUrl={bill.avatarUrl || undefined}
        className={cn("shrink-0", bill.archivedAt && "opacity-60")}
      />
      <div className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate text-sm font-bold",
            bill.archivedAt ? "text-muted-foreground" : "text-foreground",
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
