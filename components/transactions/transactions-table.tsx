import Image from "next/image"
import { cn } from "@/lib/utils"
import { formatSignedAmount } from "@/lib/format"
import type { Transaction } from "@/lib/types"

interface TransactionsTableProps {
  transactions: Transaction[]
}

export function TransactionsTable({ transactions }: TransactionsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[600px]">
        <thead>
          <tr className="border-b border-muted-foreground/10">
            <th className="pb-3 text-left text-xs font-normal text-muted-foreground">
              Recipient / Sender
            </th>
            <th className="pb-3 text-left text-xs font-normal text-muted-foreground">
              Category
            </th>
            <th className="pb-3 text-left text-xs font-normal text-muted-foreground">
              Transaction Date
            </th>
            <th className="pb-3 text-right text-xs font-normal text-muted-foreground">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => (
            <TransactionRow key={transaction.id} transaction={transaction} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface TransactionRowProps {
  transaction: Transaction
}

function TransactionRow({ transaction }: TransactionRowProps) {
  const isPositive = transaction.amount >= 0

  return (
    <tr className="border-b border-muted-foreground/10 last:border-b-0">
      <td className="py-4">
        <div className="flex items-center gap-3">
          <Image
            src={transaction.avatarUrl}
            alt=""
            width={40}
            height={40}
            className="size-10 rounded-full object-cover"
          />
          <span className="font-bold text-card-foreground">{transaction.name}</span>
        </div>
      </td>
      <td className="py-4 text-sm text-muted-foreground">{transaction.category}</td>
      <td className="py-4 text-sm text-muted-foreground">{transaction.date}</td>
      <td
        className={cn(
          "py-4 text-right text-sm font-bold",
          isPositive ? "text-accent" : "text-card-foreground"
        )}
      >
        {formatSignedAmount(transaction.amount)}
      </td>
    </tr>
  )
}
