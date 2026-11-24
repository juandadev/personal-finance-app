"use client"

import { TipJarIcon } from "@phosphor-icons/react"

import { EmptyDataCard } from "@/components/empty-data-card"
import { MoneyAmount } from "@/components/money-amount"
import { Card } from "@/components/ui/card"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useFinance } from "@/hooks/use-finance"
import type { Pot } from "@/lib/types"
import { cn } from "@/lib/utils"
import { AddPotDialog } from "./add-pot-dialog"
import { PotCard } from "./pot-card"
import styles from "./pots-layout.module.css"

function getPotCardLayouts(pots: Pot[]) {
  const tabletColumns = 2
  const desktopColumns = 3
  let tabletSlotsUsed = 0
  let desktopSlotsUsed = 0

  const orderedPots = pots.map((pot) => {
    const savedCents = Math.round(pot.amount * 100)
    const targetCents = Math.round(pot.target * 100)
    const percentage = (savedCents / targetCents) * 100
    const isNearGoal = !pot.isCompleted && savedCents * 10 > targetCents * 7

    return { pot, percentage, isNearGoal }
  })
  orderedPots.sort((a, b) => b.percentage - a.percentage)

  return orderedPots.map(({ pot, percentage, isNearGoal }) => {
    const wideTablet = isNearGoal && tabletColumns - tabletSlotsUsed >= 2
    const wideDesktop = isNearGoal && desktopColumns - desktopSlotsUsed >= 2

    tabletSlotsUsed = (tabletSlotsUsed + (wideTablet ? 2 : 1)) % tabletColumns
    desktopSlotsUsed =
      (desktopSlotsUsed + (wideDesktop ? 2 : 1)) % desktopColumns

    return {
      pot,
      percentage,
      isNearGoal,
      className: cn(
        wideTablet && styles.wideTablet,
        wideDesktop && styles.wideDesktop,
      ),
    }
  })
}

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
          <TooltipProvider delayDuration={300} skipDelayDuration={300}>
            <div className={styles.grid}>
              {getPotCardLayouts(pots).map(({ pot, ...layout }) => (
                <PotCard key={pot.id} pot={pot} {...layout} />
              ))}
            </div>
          </TooltipProvider>
        )}
      </section>
    </div>
  )
}
