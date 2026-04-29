import { TransactionsContent } from "@/components/transactions/transactions-content"

export default function TransactionsPage() {
  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-foreground text-3xl font-bold">Transactions</h1>
      <TransactionsContent />
    </div>
  )
}
