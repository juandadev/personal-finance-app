import Image from "next/image"
import { cn } from "@/lib/utils"
import { formatSignedAmount } from "@/lib/format"
import type { Transaction } from "@/lib/types"

interface TransactionItemProps {
  transaction: Transaction
}

export function TransactionItem({ transaction }: TransactionItemProps) {
  const isPositive = transaction.amount > 0

  return (
    <div className="flex items-center gap-4 py-4">
      <div className="bg-muted relative size-10 shrink-0 overflow-hidden rounded-full">
        <Image
          src={transaction.avatarUrl || "/placeholder.svg"}
          alt=""
          fill
          sizes="40px"
          className="object-cover"
        />
      </div>
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
    </div>
  )
}
