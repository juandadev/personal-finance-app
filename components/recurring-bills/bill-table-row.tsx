import Image from "next/image"
import { CircleCheck, CircleAlert } from "lucide-react"
import { formatCurrency } from "@/lib/format"
import type { RecurringBill } from "@/lib/types"
import { cn } from "@/lib/utils"
import { TableCell, TableRow } from "@/components/ui/table"

interface BillTableRowProps {
  bill: RecurringBill
}

function getDaySuffix(day: number): string {
  if (day >= 11 && day <= 13) return "th"
  switch (day % 10) {
    case 1:
      return "st"
    case 2:
      return "nd"
    case 3:
      return "rd"
    default:
      return "th"
  }
}

function formatDueDate(day: number): string {
  return `Monthly -${day}${getDaySuffix(day)}`
}

export function BillTableRow({ bill }: BillTableRowProps) {
  const isPaid = bill.status === "paid"
  const isDueSoon = bill.status === "due-soon"

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <Image
            src={bill.avatarUrl}
            alt=""
            width={40}
            height={40}
            className="size-10 rounded-full object-cover"
          />
          <span className="text-card-foreground font-bold">{bill.name}</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-sm",
              isPaid ? "text-accent" : "text-muted-foreground",
            )}
          >
            {formatDueDate(bill.dueDay)}
          </span>
          {isPaid && (
            <CircleCheck className="text-accent size-4" aria-label="Paid" />
          )}
          {isDueSoon && (
            <CircleAlert
              className="text-destructive size-4"
              aria-label="Due soon"
            />
          )}
        </div>
      </TableCell>
      <TableCell
        className={cn(
          "text-right font-bold",
          isDueSoon ? "text-destructive" : "text-card-foreground",
        )}
      >
        {formatCurrency(bill.amount, { forceDecimals: true })}
      </TableCell>
    </TableRow>
  )
}

export function MobileBillRow({ bill }: BillTableRowProps) {
  const isPaid = bill.status === "paid"
  const isDueSoon = bill.status === "due-soon"

  return (
    <li className="flex items-center justify-between py-4">
      <div className="flex items-center gap-3">
        <Image
          src={bill.avatarUrl}
          alt=""
          width={40}
          height={40}
          className="size-10 rounded-full object-cover"
        />
        <div className="flex flex-col">
          <span className="text-card-foreground text-sm font-bold">
            {bill.name}
          </span>
          <div className="mt-0.5 flex items-center gap-1">
            <span
              className={cn(
                "text-xs",
                isPaid ? "text-accent" : "text-muted-foreground",
              )}
            >
              {formatDueDate(bill.dueDay)}
            </span>
            {isPaid && (
              <CircleCheck className="text-accent size-3" aria-label="Paid" />
            )}
            {isDueSoon && (
              <CircleAlert
                className="text-destructive size-3"
                aria-label="Due soon"
              />
            )}
          </div>
        </div>
      </div>
      <span
        className={cn(
          "text-sm font-bold",
          isDueSoon ? "text-destructive" : "text-card-foreground",
        )}
      >
        {formatCurrency(bill.amount, { forceDecimals: true })}
      </span>
    </li>
  )
}
