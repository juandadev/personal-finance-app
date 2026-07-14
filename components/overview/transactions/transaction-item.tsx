import { ContactAvatar } from "@/components/contact-avatar"
import { cn } from "@/lib/utils"
import { formatSignedAmount, transactionAmountClassName } from "@/lib/format"
import type { Transaction } from "@/lib/types"

interface TransactionItemProps {
  transaction: Transaction
}

export function TransactionItem({ transaction }: TransactionItemProps) {
  return (
    <li className="flex items-center gap-4 py-5 first:pt-0 last:pb-0">
      <ContactAvatar
        name={transaction.name}
        initials={transaction.contactInitials}
        color={transaction.contactColor}
        avatarUrl={transaction.avatarUrl}
      />
      <div className="min-w-0 flex-1">
        <p className="text-foreground truncate text-sm font-bold">
          {transaction.concept}
        </p>
        <p className="text-muted-foreground truncate text-xs">
          {transaction.name}
        </p>
      </div>
      <div className="text-right">
        <p
          className={cn(
            "text-sm font-bold",
            transactionAmountClassName(transaction.amount),
          )}
        >
          {formatSignedAmount(transaction.amount)}
        </p>
        <p className="text-muted-foreground mt-1 text-xs">{transaction.date}</p>
      </div>
    </li>
  )
}
