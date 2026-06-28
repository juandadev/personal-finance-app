"use client"

import { useFinance } from "@/hooks/use-finance"
import { PotCard } from "./pot-card"

export function PotsPageContent() {
  const { pots } = useFinance()

  return (
    <div className="mt-6 grid gap-6 lg:@[829px]/main:h-[calc(100dvh-160px)] lg:@[829px]/main:grid-cols-2 lg:@[829px]/main:overflow-y-auto lg:@[829px]/main:rounded-xl lg:@[829px]/main:pr-3">
      {pots.map((pot) => (
        <PotCard key={pot.id} pot={pot} />
      ))}
    </div>
  )
}
