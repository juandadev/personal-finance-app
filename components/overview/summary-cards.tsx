"use client"

import { useFinance } from "@/hooks/use-finance"
import { SummaryCard } from "./summary-card"

export function SummaryCards() {
  const { summaryStats } = useFinance()

  return (
    <div className="grid gap-3 md:grid-cols-3 md:gap-6">
      {summaryStats.map((stat) => (
        <SummaryCard key={stat.label} stat={stat} />
      ))}
    </div>
  )
}
