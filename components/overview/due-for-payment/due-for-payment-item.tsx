import Link from "next/link"
import { WarningCircleIcon } from "@phosphor-icons/react"

import { ContactAvatar } from "@/components/contact-avatar"
import { MoneyAmount } from "@/components/money-amount"
import { MANUAL_BILLS_DUE_REMINDER_HREF } from "@/lib/finance/url-filters"
import { formatDisplayDate } from "@/lib/format"
import type { BillStatus, RecurringBill } from "@/lib/types"
import { cn } from "@/lib/utils"

const statusLabels: Partial<Record<BillStatus, string>> = {
  "due-soon": "Due Soon",
  "due-today": "Due Today",
  overdue: "Overdue",
}

function statusClassName(status: BillStatus) {
  if (status === "overdue") {
    return "text-destructive"
  }

  if (status === "due-soon" || status === "due-today") {
    return "text-warning"
  }

  return "text-muted-foreground"
}

function amountClassName(status: BillStatus) {
  if (status === "due-soon" || status === "due-today") {
    return "text-warning"
  }

  return status === "overdue" ? "text-destructive" : "text-foreground"
}

function nextDueDate(bill: RecurringBill) {
  return bill.currentOccurrence?.dueDate ?? bill.firstDueDate
}

interface DueForPaymentItemProps {
  bill: RecurringBill
}

export function DueForPaymentItem({ bill }: DueForPaymentItemProps) {
  const statusLabel = statusLabels[bill.status] ?? bill.status

  return (
    <li className="py-5 first:pt-0 last:pb-0">
      <Link
        href={MANUAL_BILLS_DUE_REMINDER_HREF}
        className="flex items-center gap-4"
      >
        <ContactAvatar
          name={bill.name}
          initials={bill.contactInitials}
          color={bill.contactColor}
          avatarUrl={bill.avatarUrl}
        />
        <div className="min-w-0 flex-1">
          <p className="text-foreground truncate text-sm font-bold">
            {bill.concept}
          </p>
          <p className="text-muted-foreground truncate text-xs">{bill.name}</p>
        </div>
        <div className="text-right">
          <p className={cn("text-sm font-bold", amountClassName(bill.status))}>
            <MoneyAmount amount={bill.amount} />
          </p>
          <p
            className={cn(
              "mt-1 flex items-center justify-end gap-1 text-xs",
              statusClassName(bill.status),
            )}
          >
            <span>{formatDisplayDate(nextDueDate(bill))}</span>
            <WarningCircleIcon
              weight="fill"
              className="size-3.5 shrink-0"
              aria-label={statusLabel}
            />
          </p>
        </div>
      </Link>
    </li>
  )
}
