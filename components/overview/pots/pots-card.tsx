"use client"

import Link from "next/link"
import { CaretRightIcon, TipJarIcon } from "@phosphor-icons/react"
import {
  Card,
  CardAction,
  CardHeader,
  CardTitle,
  cardActionLinkClasses,
} from "@/components/ui/card"
import { MoneyAmount } from "@/components/money-amount"
import { useFinance } from "@/hooks/use-finance"
import { PotItem } from "./pot-item"

export function PotsCard() {
  const { pots, totalSaved } = useFinance()
  const hasPots = pots.length > 0

  return (
    <Card asChild>
      <section>
        <CardHeader>
          <CardTitle>
            <h2>Pots</h2>
          </CardTitle>
          <CardAction>
            <Link href="/pots" className={cardActionLinkClasses}>
              See Details
              <CaretRightIcon weight="fill" className="size-3" aria-hidden />
            </Link>
          </CardAction>
        </CardHeader>
        <div className="mt-5 flex flex-col items-center gap-5 self-stretch md:flex-row">
          <div className="bg-background flex w-full items-center gap-4 rounded-lg p-4 md:max-w-61.75">
            <TipJarIcon
              className="text-accent size-10"
              aria-hidden
              weight="light"
            />
            <div>
              <p className="text-muted-foreground text-sm">Total Saved</p>
              <p className="mt-1 text-3xl font-bold tracking-tight">
                <MoneyAmount
                  amount={totalSaved}
                  expandedClassName="bg-background pr-1 rounded-sm"
                />
              </p>
            </div>
          </div>
          <ul className="grid w-full flex-1 grid-cols-2 gap-4">
            {hasPots ? (
              pots.slice(0, 4).map((pot) => <PotItem key={pot.id} pot={pot} />)
            ) : (
              <GhostPotItem />
            )}
          </ul>
        </div>
      </section>
    </Card>
  )
}

function GhostPotItem() {
  return (
    <li className="border-border/80 bg-background/70 col-span-2 flex items-center gap-4 rounded-lg border border-dashed p-4">
      <span
        aria-hidden
        className="bg-muted-foreground/25 block h-10 w-1 rounded-full"
      />
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground text-sm">Create your first pot</p>
        <p className="text-foreground mt-1 text-sm font-bold">
          <MoneyAmount amount={0} />
        </p>
      </div>
    </li>
  )
}
