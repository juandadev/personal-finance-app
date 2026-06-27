import Image from "next/image"
import { formatCurrency } from "@/lib/format"
import type { Transaction } from "@/lib/types"

interface LatestSpendingItemProps {
  transaction: Transaction
}

export function LatestSpendingItem({ transaction }: LatestSpendingItemProps) {
  return (
    <li className="flex items-center justify-between gap-1 py-3 first:pt-0 last:pb-0">
      <div className="flex flex-1 items-center gap-3">
        <Image
          src={transaction.avatarUrl}
          alt=""
          width={32}
          height={32}
          className="size-8 rounded-full object-cover"
        />
        <span className="text-foreground truncate text-sm font-bold">
          {transaction.name}
        </span>
      </div>
      <div className="flex flex-col items-end">
        <span className="text-foreground text-sm font-bold">
          {formatCurrency(transaction.amount, { forceDecimals: true })}
        </span>
        <span className="text-muted-foreground text-xs">
          {transaction.date}
        </span>
      </div>
    </li>
  )
}
