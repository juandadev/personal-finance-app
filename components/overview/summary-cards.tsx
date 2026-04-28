import { summaryStats } from "@/lib/data"
import { SummaryCard } from "./summary-card"

export function SummaryCards() {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {summaryStats.map((stat) => (
        <SummaryCard key={stat.label} stat={stat} />
      ))}
    </div>
  )
}
