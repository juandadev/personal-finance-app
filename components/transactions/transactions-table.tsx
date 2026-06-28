import Image from "next/image"
import { cn } from "@/lib/utils"
import { formatSignedAmount } from "@/lib/format"
import type { Transaction } from "@/lib/types"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface TransactionsTableProps {
  transactions: Transaction[]
}

export function TransactionsTable({ transactions }: TransactionsTableProps) {
  return (
    <>
      <ul className="divide-muted-foreground/10 divide-y md:hidden">
        {transactions.map((transaction) => (
          <MobileTransactionItem
            key={transaction.id}
            transaction={transaction}
          />
        ))}
      </ul>

      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Recipient / Sender</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Transaction Date</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => (
              <TransactionRow key={transaction.id} transaction={transaction} />
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}

interface TransactionItemProps {
  transaction: Transaction
}

function MobileTransactionItem({ transaction }: TransactionItemProps) {
  const isPositive = transaction.amount > 0

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
          <span className="text-foreground text-sm font-bold">
            {transaction.name}
          </span>
          <span className="text-muted-foreground text-xs">
            {transaction.category}
          </span>
        </div>
      </div>
      <div className="flex flex-col items-end">
        <span
          className={cn(
            "text-sm font-bold",
            isPositive ? "text-accent" : "text-foreground",
          )}
        >
          {formatSignedAmount(transaction.amount)}
        </span>
        <span className="text-muted-foreground text-xs">
          {transaction.date}
        </span>
      </div>
    </li>
  )
}

function TransactionRow({ transaction }: TransactionItemProps) {
  const isPositive = transaction.amount > 0

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <Image
            src={transaction.avatarUrl}
            alt=""
            width={40}
            height={40}
            className="size-10 rounded-full object-cover"
          />
          <span className="text-foreground font-bold">{transaction.name}</span>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {transaction.category}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {transaction.date}
      </TableCell>
      <TableCell
        className={cn(
          "text-right font-bold",
          isPositive ? "text-accent" : "text-foreground",
        )}
      >
        {formatSignedAmount(transaction.amount)}
      </TableCell>
    </TableRow>
  )
}
