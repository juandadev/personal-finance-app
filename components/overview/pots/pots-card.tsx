"use client"

import { Card } from "@/components/ui/card"
import { useFinance } from "@/hooks/use-finance"
import { formatCurrency } from "@/lib/format"
import { CardHeader } from "../card-header"
import { PotItem } from "./pot-item"
import PotIcon from "@/components/icons/PotIcon"

export function PotsCard() {
  const { pots, totalSaved } = useFinance()

  return (
    <Card asChild>
      <section>
        <CardHeader title="Pots" actionLabel="See Details" href="/pots" />
        <div className="mt-5 flex flex-col items-center gap-5 self-stretch md:flex-row">
          <div className="bg-background flex w-full items-center gap-4 rounded-lg p-4 md:max-w-61.75">
            <PotIcon className="text-accent size-8" aria-hidden />
            <div>
              <p className="text-muted-foreground text-sm">Total Saved</p>
              <p className="mt-1 text-[32px] font-bold tracking-tight">
                {formatCurrency(totalSaved)}
              </p>
            </div>
          </div>
          <ul className="grid w-full flex-1 grid-cols-2 gap-4">
            {pots.slice(0, 4).map((pot) => (
              <PotItem key={pot.id} pot={pot} />
            ))}
          </ul>
        </div>
      </section>
    </Card>
  )
}
