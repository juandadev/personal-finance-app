import Image from "next/image"
import { CircleCheck, CircleAlert } from "lucide-react"
import { formatCurrency } from "@/lib/format"
import type { RecurringBill } from "@/lib/types"
import { cn } from "@/lib/utils"

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
    <tr className="border-b border-muted-foreground/10 last:border-b-0">
      <td className="py-4">
        <div className="flex items-center gap-3">
          <Image
            src={bill.avatarUrl}
            alt=""
            width={40}
            height={40}
            className="size-10 rounded-full object-cover"
          />
          <span className="font-bold text-card-foreground">{bill.name}</span>
        </div>
      </td>
      <td className="py-4">
        <div className="flex items-center gap-2">
          <span className={cn("text-sm", isPaid ? "text-accent" : "text-muted-foreground")}>
            {formatDueDate(bill.dueDay)}
          </span>
          {isPaid && <CircleCheck className="size-4 text-accent" aria-label="Paid" />}
          {isDueSoon && <CircleAlert className="size-4 text-destructive" aria-label="Due soon" />}
        </div>
      </td>
      <td className={cn("py-4 text-right text-sm font-bold", isDueSoon ? "text-destructive" : "text-card-foreground")}>
        {formatCurrency(bill.amount, { forceDecimals: true })}
      </td>
    </tr>
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
          <span className="text-sm font-bold text-card-foreground">{bill.name}</span>
          <div className="mt-0.5 flex items-center gap-1">
            <span className={cn("text-xs", isPaid ? "text-accent" : "text-muted-foreground")}>
              {formatDueDate(bill.dueDay)}
            </span>
            {isPaid && <CircleCheck className="size-3 text-accent" aria-label="Paid" />}
            {isDueSoon && <CircleAlert className="size-3 text-destructive" aria-label="Due soon" />}
          </div>
        </div>
      </div>
      <span className={cn("text-sm font-bold", isDueSoon ? "text-destructive" : "text-card-foreground")}>
        {formatCurrency(bill.amount, { forceDecimals: true })}
      </span>
    </li>
  )
}
