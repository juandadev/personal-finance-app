import { AppShell } from "@/components/app-shell"
import { TransactionsContent } from "@/components/transactions/transactions-content"

export default function TransactionsPage() {
  return (
    <AppShell activeKey="transactions">
      <div className="flex flex-col gap-8">
        <h1 className="text-3xl font-bold text-foreground">Transactions</h1>
        <TransactionsContent />
      </div>
    </AppShell>
  )
}
