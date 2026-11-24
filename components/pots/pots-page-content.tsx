"use client"

import { TipJarIcon } from "@phosphor-icons/react"

import { EmptyDataCard } from "@/components/empty-data-card"
import { MoneyAmount } from "@/components/money-amount"
import { Card } from "@/components/ui/card"
import { useFinance } from "@/hooks/use-finance"
import { AddPotDialog } from "./add-pot-dialog"
import { PotsGrid } from "./pots-grid"
import styles from "./pots-layout.module.css"

export function PotsPageContent() {
  const { pots, potsSummary } = useFinance()

  return (
    <div className="space-y-8">
      <dl aria-label="Pots summary" className={styles.summary}>
        <Card variant="primary" padding="overview">
          <dt className="text-sm">Total savings</dt>
          <dd className="mt-3 text-3xl font-bold tracking-tight">
            <MoneyAmount amount={potsSummary.activeSavings} forceDecimals />
          </dd>
        </Card>
        <Card padding="overview">
          <dt className="text-muted-foreground text-sm">Active goals</dt>
          <dd className="mt-3 text-3xl font-bold tabular-nums">
            {potsSummary.activeCount}
          </dd>
        </Card>
        <Card padding="overview">
          <dt className="text-muted-foreground text-sm">Goals completed</dt>
          <dd className="mt-3 text-3xl font-bold tabular-nums">
            {potsSummary.completedCount}
          </dd>
        </Card>
      </dl>

      <section aria-labelledby="your-pots-heading" className="space-y-4">
        <h2 id="your-pots-heading" className="text-xl font-bold tracking-tight">
          Your Pots
        </h2>
        {pots.length === 0 ? (
          <EmptyDataCard
            className="min-h-90"
            icon={<TipJarIcon className="size-5" weight="fill" aria-hidden />}
            surface="card"
            title="Start With Your First Pot"
            description="Create a savings pot for a goal, rainy day fund, or planned purchase. Your progress will appear here as you save."
            action={<AddPotDialog />}
          />
        ) : (
          <PotsGrid />
        )}
      </section>
    </div>
  )
}
