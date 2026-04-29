"use client"

import { PiggyBank } from "lucide-react"
import { useFinance } from "@/hooks/use-finance"
import { formatCurrency } from "@/lib/format"
import { CardHeader } from "../card-header"
import { PotItem } from "./pot-item"

export function PotsCard() {
  const { pots, totalSaved } = useFinance()

  return (
    <section className="bg-card rounded-xl p-6 shadow-sm md:p-8">
      <CardHeader title="Pots" actionLabel="See Details" href="/pots" />

      <div className="mt-6 grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="bg-background flex items-center gap-4 rounded-xl p-5">
          <span className="bg-card text-accent grid size-10 place-items-center rounded-full">
            <PiggyBank className="size-5" aria-hidden />
          </span>
          <div>
            <p className="text-muted-foreground text-xs">Total Saved</p>
            <p className="mt-1 text-3xl font-bold tracking-tight">
              {formatCurrency(totalSaved)}
            </p>
          </div>
        </div>

        <ul className="grid grid-cols-2 gap-4">
          {pots.slice(0, 4).map((pot) => (
            <li key={pot.id}>
              <PotItem pot={pot} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
