"use client"

import Link from "next/link"
import { CreditCardIcon } from "lucide-react"

import { ItemActions } from "@/components/actions"
import { CloseCreditCardStatementDialog } from "@/components/credit-cards/close-credit-card-statement-dialog"
import { CreditCardBadge } from "@/components/credit-cards/credit-card-badge"
import { EditCreditCardDialog } from "@/components/credit-cards/credit-card-dialog"
import { PayCreditCardStatementDialog } from "@/components/credit-cards/pay-credit-card-statement-dialog"
import { EmptyDataCard } from "@/components/empty-data-card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogCloseButton,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { FormStatusMessage } from "@/components/ui/form"
import { useFinance } from "@/hooks/use-finance"
import {
  formatCurrency,
  formatDisplayDate,
  formatDisplayDateRange,
} from "@/lib/format"
import type { CreditCard, CreditCardDueStatus } from "@/lib/types"
import { cn } from "@/lib/utils"
import { useState } from "react"

const statusLabels: Record<CreditCardDueStatus, string> = {
  upcoming: "Upcoming",
  "due-soon": "Due Soon",
  "due-today": "Due Today",
  overdue: "Overdue",
  paid: "Paid",
}

function statusClassName(status: CreditCardDueStatus) {
  switch (status) {
    case "overdue":
    case "due-today":
      return "text-destructive"
    case "due-soon":
      return "text-foreground"
    case "paid":
      return "text-accent"
    case "upcoming":
      return "text-muted-foreground"
  }
}

export function CreditCardsPageContent() {
  const { creditCards, creditCardSummary, totalCreditCardStatementBalance } =
    useFinance()
  const activeCards = creditCards.filter((card) => !card.archivedAt)

  return (
    <div className="mt-6 space-y-6">
      <div className="grid gap-3 md:grid-cols-4 md:gap-6">
        <Card padding="overview" variant="primary">
          <p className="text-primary-foreground text-sm">Statement Balance</p>
          <p className="mt-3 text-3xl font-bold tracking-tight">
            {formatCurrency(totalCreditCardStatementBalance, {
              forceDecimals: true,
            })}
          </p>
        </Card>
        {creditCardSummary.map((summary) => (
          <Card key={summary.label} padding="overview">
            <p className="text-muted-foreground text-sm">{summary.label}</p>
            <p className="mt-3 text-3xl font-bold tracking-tight">
              {formatCurrency(summary.amount, { forceDecimals: true })}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              {summary.count} card{summary.count === 1 ? "" : "s"}
            </p>
          </Card>
        ))}
      </div>

      {activeCards.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {activeCards.map((creditCard) => (
            <CreditCardTile key={creditCard.id} creditCard={creditCard} />
          ))}
        </div>
      ) : (
        <EmptyDataCard
          surface="card"
          className="min-h-90"
          icon={<CreditCardIcon className="size-5" aria-hidden />}
          title="No Credit Cards Yet"
          description="Add your cards with safe identifying details so purchases can build statement balances and payment reminders."
        />
      )}
    </div>
  )
}

function CreditCardTile({ creditCard }: { creditCard: CreditCard }) {
  const { state } = useFinance()
  const rawCreditCard = state.creditCards.find(
    (card) => card.id === creditCard.id,
  )
  const status = creditCard.dueStatus
  const hasReservedInstallments = creditCard.reservedInstallmentAmount > 0

  return (
    <Card className="flex flex-col gap-5" padding="fixed">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <CreditCardBadge
            nickname={creditCard.nickname}
            initials={creditCard.initials}
            color={creditCard.color}
          />
          <div>
            <h2 className="text-xl font-bold tracking-tight">
              {creditCard.nickname}
            </h2>
            <p className="text-muted-foreground text-sm">
              {creditCard.issuer} {creditCard.network} ••••{" "}
              {creditCard.lastFour}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className={cn("text-sm font-bold", statusClassName(status))}>
            {statusLabels[status]}
          </span>
          <ItemActions ariaLabel={`More options for ${creditCard.nickname}`}>
            {rawCreditCard ? (
              <EditCreditCardDialog
                creditCard={rawCreditCard}
                trigger={<DropdownMenuItem>Edit Credit Card</DropdownMenuItem>}
              />
            ) : null}
            <ArchiveCreditCardDialog creditCard={creditCard} />
          </ItemActions>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Metric
          label="Current Statement"
          value={formatCurrency(creditCard.currentStatementAmount, {
            forceDecimals: true,
          })}
        />
        <Metric
          label="Available Credit"
          value={formatCurrency(creditCard.availableCredit, {
            forceDecimals: true,
          })}
        />
        <Metric label="Closing Day" value={`Day ${creditCard.closingDay}`} />
        <Metric label="Due Day" value={`Day ${creditCard.paymentDueDay}`} />
      </div>

      {hasReservedInstallments ? (
        <p className="text-muted-foreground text-sm">
          Includes{" "}
          {formatCurrency(creditCard.reservedInstallmentAmount, {
            forceDecimals: true,
          })}{" "}
          reserved for installments.
        </p>
      ) : null}

      {creditCard.currentStatement ? (
        <p className="text-muted-foreground text-sm">
          Current period:{" "}
          {formatDisplayDateRange(
            creditCard.currentStatement.periodStart,
            creditCard.currentStatement.periodEnd,
          )}
          . Due {formatDisplayDate(creditCard.currentStatement.paymentDueDate)}.
        </p>
      ) : (
        <p className="text-muted-foreground text-sm">
          No statement activity yet. Card purchases will appear here once added.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="secondary" size="sm">
          <Link href={`/credit-cards/${creditCard.id}`}>See Details</Link>
        </Button>
        <PayCreditCardStatementDialog creditCard={creditCard} />
        <CloseCreditCardStatementDialog creditCard={creditCard} />
      </div>
    </Card>
  )
}

function ArchiveCreditCardDialog({ creditCard }: { creditCard: CreditCard }) {
  const { actions } = useFinance()
  const [open, setOpen] = useState(false)
  const [statusMessage, setStatusMessage] = useState("")
  const [isArchiving, setIsArchiving] = useState(false)

  const handleArchive = async () => {
    setIsArchiving(true)
    setStatusMessage("")

    const result = await actions.archiveCreditCard(creditCard.id)

    setIsArchiving(false)

    if (!result.ok) {
      setStatusMessage(result.message)
      return
    }

    setOpen(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <DropdownMenuItem variant="destructive">
          Archive Credit Card
        </DropdownMenuItem>
      </AlertDialogTrigger>
      <AlertDialogContent variant="finance">
        <AlertDialogHeader className="text-left">
          <AlertDialogTitle variant="finance">
            Archive {creditCard.nickname}?
          </AlertDialogTitle>
          <AlertDialogDescription variant="finance">
            Archiving removes this card from active tracking while keeping its
            statement and transaction history.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogCloseButton aria-label="Close archive credit card dialog" />
        <div className="mt-5 flex flex-col gap-5">
          {statusMessage ? (
            <FormStatusMessage variant="error">
              {statusMessage}
            </FormStatusMessage>
          ) : null}
          <AlertDialogAction
            variant="destructive"
            size="finance-submit"
            disabled={isArchiving}
            onClick={(event) => {
              event.preventDefault()
              void handleArchive()
            }}
          >
            {isArchiving ? "Archiving..." : "Archive Credit Card"}
          </AlertDialogAction>
          <AlertDialogCancel
            variant="muted-link"
            size="text-link"
            className="mx-auto"
          >
            Cancel
          </AlertDialogCancel>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background rounded-lg p-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-foreground mt-1 text-sm font-bold">{value}</p>
    </div>
  )
}
