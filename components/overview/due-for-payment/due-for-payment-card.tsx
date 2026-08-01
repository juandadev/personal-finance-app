"use client"

import Link from "next/link"
import { CaretRightIcon, CheckCircleIcon } from "@phosphor-icons/react"

import { EmptyDataCard } from "@/components/empty-data-card"
import {
  Card,
  CardAction,
  CardHeader,
  CardTitle,
  cardActionLinkClasses,
} from "@/components/ui/card"
import { useFinance } from "@/hooks/use-finance"
import { MANUAL_BILLS_DUE_REMINDER_HREF } from "@/lib/finance/url-filters"

import { DueForPaymentItem } from "./due-for-payment-item"

export function DueForPaymentCard() {
  const { manualBillsDueReminder } = useFinance()
  const hasBills = manualBillsDueReminder.length > 0

  return (
    <Card asChild padding="overview">
      <section>
        <CardHeader>
          <CardTitle>
            <h2>Due for payment</h2>
          </CardTitle>
          <CardAction>
            <Link
              href={MANUAL_BILLS_DUE_REMINDER_HREF}
              className={cardActionLinkClasses}
            >
              View All
              <CaretRightIcon weight="fill" className="size-3" aria-hidden />
            </Link>
          </CardAction>
        </CardHeader>

        {hasBills ? (
          <ul className="divide-muted-foreground/10 mt-8 divide-y">
            {manualBillsDueReminder.slice(0, 4).map((bill) => (
              <DueForPaymentItem key={bill.id} bill={bill} />
            ))}
          </ul>
        ) : (
          <EmptyDataCard
            className="mt-8 min-h-45 p-5 md:p-6"
            icon={
              <CheckCircleIcon weight="fill" className="size-5" aria-hidden />
            }
            title="You’re all caught up"
            description="No manual bills need payment soon."
          />
        )}
      </section>
    </Card>
  )
}
