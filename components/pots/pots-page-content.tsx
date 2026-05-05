"use client"

import { useFinance } from "@/hooks/use-finance"
import { PotCard } from "./pot-card"

export function PotsPageContent() {
  const { pots } = useFinance()

  return (
    <div className="mt-6 grid gap-6 lg:@[829px]/main:grid-cols-2">
      {pots.map((pot) => (
        <PotCard key={pot.id} pot={pot} />
      ))}
    </div>
  )
}
