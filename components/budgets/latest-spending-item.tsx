import { ContactAvatar } from "@/components/contact-avatar"
import { MoneyAmount } from "@/components/money-amount"
import { Badge } from "@/components/ui/badge"
import { transactionAmountClassName } from "@/lib/format"
import type { Transaction } from "@/lib/types"
import { cn } from "@/lib/utils"

interface LatestSpendingItemProps {
  transaction: Transaction
}

export function LatestSpendingItem({ transaction }: LatestSpendingItemProps) {
  return (
    <li className="flex items-center justify-between gap-1 py-3 first:pt-0 last:pb-0">
      <div className="flex flex-1 items-center gap-3">
        <ContactAvatar
          name={transaction.name}
          initials={transaction.contactInitials}
          color={transaction.contactColor}
          avatarUrl={transaction.avatarUrl}
          className="size-8"
        />
        <span className="flex min-w-0 flex-col gap-1">
          <span className="text-foreground truncate text-sm font-bold">
            {transaction.concept}
          </span>
          {transaction.isVoucherExpense ? (
            <Badge variant="secondary">Voucher</Badge>
          ) : null}
        </span>
      </div>
      <div className="flex flex-col items-end">
        <span
          className={cn(
            "text-sm font-bold",
            transactionAmountClassName(transaction.amount),
          )}
        >
          <MoneyAmount amount={transaction.amount} variant="signed" />
        </span>
        <span className="text-muted-foreground text-xs">
          {transaction.date}
        </span>
      </div>
    </li>
  )
}
