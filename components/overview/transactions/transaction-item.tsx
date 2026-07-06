import { ContactAvatar } from "@/components/contact-avatar"
import { cn } from "@/lib/utils"
import { formatSignedAmount } from "@/lib/format"
import type { Transaction } from "@/lib/types"

interface TransactionItemProps {
  transaction: Transaction
}

export function TransactionItem({ transaction }: TransactionItemProps) {
  const isPositive = transaction.amount > 0

  return (
    <li className="flex items-center gap-4 py-5 first:pt-0 last:pb-0">
      <ContactAvatar
        name={transaction.name}
        initials={transaction.contactInitials}
        color={transaction.contactColor}
        avatarUrl={transaction.avatarUrl}
      />
      <p className="text-foreground flex-1 truncate text-sm font-bold">
        {transaction.name}
      </p>
      <div className="text-right">
        <p
          className={cn(
            "text-sm font-bold",
            isPositive ? "text-accent" : "text-foreground",
          )}
        >
          {formatSignedAmount(transaction.amount)}
        </p>
        <p className="text-muted-foreground mt-1 text-xs">{transaction.date}</p>
      </div>
    </li>
  )
}
