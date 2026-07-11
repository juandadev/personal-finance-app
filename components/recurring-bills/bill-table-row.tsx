"use client"

import { CircleAlert, CircleCheck, CreditCard, MinusCircle } from "lucide-react"

import { ItemActions } from "@/components/actions"
import { ContactAvatar } from "@/components/contact-avatar"
import { ArchiveBillDialog } from "@/components/recurring-bills/archive-bill-dialog"
import { EditBillDialog } from "@/components/recurring-bills/bill-dialog"
import { PayBillDialog } from "@/components/recurring-bills/pay-bill-dialog"
import { SkipBillOccurrenceDialog } from "@/components/recurring-bills/skip-bill-occurrence-dialog"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { TableCell, TableRow } from "@/components/ui/table"
import { formatCurrency, formatDisplayDate } from "@/lib/format"
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
  if (bill.totalPayments && bill.currentOccurrence) {
    return `Payment ${bill.currentOccurrence.sequence} of ${bill.totalPayments}`
  }

  return bill.frequency === "yearly" ? "Yearly" : "Monthly"
}

function StatusIndicator({
  bill,
  iconClassName,
}: {
  bill: RecurringBill
  iconClassName?: string
}) {
  const occurrence = bill.currentOccurrence
  const status = bill.status

  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("text-sm", statusClassName(status))}>
        {occurrence
          ? formatDisplayDate(occurrence.statusDueDate ?? occurrence.dueDate)
          : "—"}{" "}
        · <span className="font-semibold">{statusLabels[status]}</span>
      </span>
      {status === "paid" ? (
        <CircleCheck
          className={cn("text-accent size-4", iconClassName)}
          aria-hidden
        />
      ) : null}
      {status === "skipped" ? (
        <MinusCircle
          className={cn("text-muted-foreground size-4", iconClassName)}
          aria-hidden
        />
      ) : null}
      {isWarning(status) || status === "overdue" ? (
        <CircleAlert
          className={cn(statusClassName(status), "size-4", iconClassName)}
          aria-hidden
        />
      ) : null}
    </span>
  )
}

function BillIdentity({ bill }: { bill: RecurringBill }) {
  return (
    <div className="flex items-center gap-3">
      <ContactAvatar
        name={bill.name}
        initials={bill.contactInitials}
        color={bill.contactColor}
        avatarUrl={bill.avatarUrl || undefined}
        className={cn(bill.archivedAt && "opacity-60")}
      />
      <div className="flex flex-col">
        <span
          className={cn(
            "font-bold",
            bill.archivedAt ? "text-muted-foreground" : "text-foreground",
          )}
        >
          {bill.concept}
        </span>
        <span className="text-muted-foreground flex items-center gap-1 text-xs">
          {scheduleLabel(bill)}
          {bill.creditCardId ? (
            <CreditCard className="size-3" aria-label="Charges to a card" />
          ) : null}
        </span>
        <span className="text-muted-foreground text-xs font-semibold">
          {bill.name}
        </span>
      </div>
    </div>
  )
}

function BillActions({ bill }: { bill: RecurringBill }) {
  const occurrence = bill.currentOccurrence
  const isActionable =
    !bill.archivedAt &&
    occurrence &&
    occurrence.status !== "paid" &&
    occurrence.status !== "skipped"
  // Card-assigned bills settle through the card's statement payment.
  const canSettleManually = isActionable && !bill.creditCardId

  return (
    <div className="flex items-center justify-end gap-1">
      {canSettleManually && occurrence ? (
        <>
          <SkipBillOccurrenceDialog bill={bill} occurrence={occurrence} />
          <PayBillDialog bill={bill} occurrence={occurrence} />
        </>
      ) : null}
      {!bill.archivedAt ? (
        <ItemActions ariaLabel={`More options for ${bill.concept}`}>
          <EditBillDialog
            bill={bill}
            trigger={<DropdownMenuItem>Edit Bill</DropdownMenuItem>}
          />
          {bill.hasPayments ? (
            <ArchiveBillDialog
              bill={bill}
              trigger={
                <DropdownMenuItem variant="destructive">
                  Archive Bill
                </DropdownMenuItem>
              }
            />
          ) : null}
        </ItemActions>
      ) : null}
    </div>
  )
}

export function BillTableRow({ bill }: BillTableRowProps) {
  return (
    <TableRow className={cn(bill.archivedAt && "opacity-70")}>
      <TableCell>
        <BillIdentity bill={bill} />
      </TableCell>
      <TableCell>
        <StatusIndicator bill={bill} />
      </TableCell>
      <TableCell
        className={cn("text-right font-bold", amountClassName(bill.status))}
      >
        {formatCurrency(bill.currentOccurrence?.amount ?? bill.amount, {
          forceDecimals: true,
        })}
      </TableCell>
      <TableCell className="text-right">
        <BillActions bill={bill} />
      </TableCell>
    </TableRow>
  )
}

export function MobileBillRow({ bill }: BillTableRowProps) {
  return (
    <li
      className={cn(
        "flex flex-col gap-3 py-4",
        bill.archivedAt && "opacity-70",
      )}
    >
      <div className="flex items-center justify-between">
        <BillIdentity bill={bill} />
        <span className={cn("text-sm font-bold", amountClassName(bill.status))}>
          {formatCurrency(bill.currentOccurrence?.amount ?? bill.amount, {
            forceDecimals: true,
          })}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <StatusIndicator bill={bill} iconClassName="size-3" />
        <BillActions bill={bill} />
      </div>
    </li>
  )
}
