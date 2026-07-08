"use client"

import Link from "next/link"

import CaretRightIcon from "@/components/icons/CaretRightIcon"
import {
  Card,
  CardAction,
  CardHeader,
  CardTitle,
  cardActionLinkClasses,
} from "@/components/ui/card"
import { useFinance } from "@/hooks/use-finance"
import { CreditCardRow } from "./credit-card-row"

export function CreditCardsCard() {
  const { creditCardSummary } = useFinance()

  return (
    <Card asChild padding="overview" className="flex-1">
      <section>
        <CardHeader>
          <CardTitle>
            <h2>Credit Cards</h2>
          </CardTitle>
          <CardAction>
            <Link href="/credit-cards" className={cardActionLinkClasses}>
              See Details
              <CaretRightIcon className="size-2" aria-hidden />
            </Link>
          </CardAction>
        </CardHeader>
        <ul className="mt-8 flex flex-col gap-3">
          {creditCardSummary.map((summary) => (
            <CreditCardRow key={summary.label} summary={summary} />
          ))}
        </ul>
      </section>
    </Card>
  )
}
