import { AppShell } from "@/components/app-shell"
import { TransactionsContent } from "@/components/transactions/transactions-content"

export default function TransactionsPage() {
  return (
    <AppShell activeKey="transactions">
      <div className="flex flex-col gap-8">
        <h1 className="text-foreground text-3xl font-bold">Transactions</h1>
        <TransactionsContent />
      </div>
    </AppShell>
  )
}
