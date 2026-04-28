"use client"

import { useFinance } from "@/hooks/use-finance"
import { SummaryCard } from "./summary-card"

export function SummaryCards() {
  const { summaryStats } = useFinance()

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {summaryStats.map((stat) => (
        <SummaryCard key={stat.label} stat={stat} />
      ))}
    </div>
  )
}
