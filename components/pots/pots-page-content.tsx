"use client"

import { PiggyBank } from "lucide-react"

import { EmptyDataCard } from "@/components/empty-data-card"
import { useFinance } from "@/hooks/use-finance"
import { AddPotDialog } from "./add-pot-dialog"
import { PotCard } from "./pot-card"

export function PotsPageContent() {
  const { pots } = useFinance()

  if (pots.length === 0) {
    return (
      <div className="mt-6">
        <EmptyDataCard
          className="min-h-90"
          icon={<PiggyBank className="size-5" aria-hidden />}
          title="Start With Your First Pot"
          description="Create a savings pot for a goal, rainy day fund, or planned purchase. Your progress will appear here as you save."
          action={<AddPotDialog />}
        />
      </div>
    )
  }

  return (
    <div className="mt-6 grid gap-6 lg:@[829px]/main:h-[calc(100dvh-160px)] lg:@[829px]/main:grid-cols-2 lg:@[829px]/main:overflow-y-auto lg:@[829px]/main:rounded-xl lg:@[829px]/main:pr-3">
      {pots.map((pot) => (
        <PotCard key={pot.id} pot={pot} />
      ))}
    </div>
  )
}
