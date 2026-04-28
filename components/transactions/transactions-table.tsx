import Image from "next/image"
import { cn } from "@/lib/utils"
import { formatSignedAmount } from "@/lib/format"
import type { Transaction } from "@/lib/types"

interface TransactionsTableProps {
  transactions: Transaction[]
}

export function TransactionsTable({ transactions }: TransactionsTableProps) {
  return (
    <>
      {/* Mobile list view */}
      <ul className="divide-y divide-muted-foreground/10 md:hidden">
        {transactions.map((transaction) => (
          <MobileTransactionItem key={transaction.id} transaction={transaction} />
        ))}
      </ul>

      {/* Desktop table view */}
      <div className="hidden md:block">
        <table className="w-full">
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
    </>
  )
}

interface TransactionItemProps {
  transaction: Transaction
}

function MobileTransactionItem({ transaction }: TransactionItemProps) {
  const isPositive = transaction.amount >= 0

  return (
    <li className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <Image
          src={transaction.avatarUrl}
          alt=""
          width={40}
          height={40}
          className="size-10 rounded-full object-cover"
        />
        <div className="flex flex-col">
          <span className="text-sm font-bold text-card-foreground">{transaction.name}</span>
          <span className="text-xs text-muted-foreground">{transaction.category}</span>
        </div>
      </div>
      <div className="flex flex-col items-end">
        <span
          className={cn(
            "text-sm font-bold",
            isPositive ? "text-accent" : "text-card-foreground"
          )}
        >
          {formatSignedAmount(transaction.amount)}
        </span>
        <span className="text-xs text-muted-foreground">{transaction.date}</span>
      </div>
    </li>
  )
}

function TransactionRow({ transaction }: TransactionItemProps) {
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
