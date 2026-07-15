"use client"

import Link from "next/link"
import { CreditCardIcon } from "@phosphor-icons/react"

import { ItemActions } from "@/components/actions"
import { CloseCreditCardStatementDialog } from "@/components/credit-cards/close-credit-card-statement-dialog"
import { CreditCardBadge } from "@/components/credit-cards/credit-card-badge"
import { EditCreditCardDialog } from "@/components/credit-cards/credit-card-dialog"
import { PayCreditCardStatementDialog } from "@/components/credit-cards/pay-credit-card-statement-dialog"
import { CreditUtilizationBar } from "@/components/credit-cards/credit-utilization-bar"
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
import { themeColorClasses } from "@/lib/theme-colors"
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
      return "text-warning"
    case "paid":
      return "text-accent"
    case "upcoming":
      return "text-muted-foreground"
  }
}

export function CreditCardsPageContent() {
  const { creditCards, creditCardSummary, totalCreditCardPendingBalance } =
    useFinance()
  const activeCards = creditCards.filter((card) => !card.archivedAt)

  return (
    <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pr-2">
      <div className="grid gap-3 md:grid-cols-2 md:gap-6 xl:grid-cols-4">
        <Card padding="overview" variant="primary">
          <p className="text-primary-foreground text-sm">Total Pending</p>
          <p className="mt-3 text-3xl font-bold tracking-tight">
            {formatCurrency(totalCreditCardPendingBalance, {
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
          icon={<CreditCardIcon weight="fill" className="size-5" aria-hidden />}
          title="No Credit Cards Yet"
          description="Add your cards with safe identifying details so purchases can build statement balances and payment reminders."
        />
      )}
    </div>
  )
}

function CreditCardTile({ creditCard }: { creditCard: CreditCard }) {
  const { state } = useFinance()
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isArchiveOpen, setIsArchiveOpen] = useState(false)
  const rawCreditCard = state.creditCards.find(
    (card) => card.id === creditCard.id,
  )
  const status = creditCard.dueStatus
  const hasReservedInstallments = creditCard.reservedInstallmentAmount > 0

  return (
    <Card className="flex flex-col justify-between gap-5" padding="fixed">
      <div className="space-y-5">
        <div className="flex flex-col-reverse items-start justify-between gap-4 md:flex-row">
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
          <div className="flex items-center gap-1 self-end md:self-start">
            <span
              className={cn("text-sm font-semibold", statusClassName(status))}
            >
              {statusLabels[status]}
            </span>
            <ItemActions ariaLabel={`More options for ${creditCard.nickname}`}>
              {rawCreditCard ? (
                <DropdownMenuItem onSelect={() => setIsEditOpen(true)}>
                  Edit Credit Card
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => setIsArchiveOpen(true)}
              >
                Archive Credit Card
              </DropdownMenuItem>
            </ItemActions>
          </div>
        </div>

        <div>
          <p className="text-muted-foreground mb-3 text-sm">
            Available Credit:{" "}
            <span className="text-foreground font-semibold">
              {formatCurrency(creditCard.availableCredit, {
                forceDecimals: true,
              })}
            </span>
          </p>
          <CreditUtilizationBar
            creditLimit={creditCard.creditLimit}
            totalPendingAmount={creditCard.totalPendingAmount}
            reservedInstallmentAmount={creditCard.reservedInstallmentAmount}
            color={creditCard.color}
          />

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <CreditValue
              label="Total Pending"
              value={formatCurrency(creditCard.totalPendingAmount, {
                forceDecimals: true,
              })}
              indicatorClassName={themeColorClasses[creditCard.color].bg}
            />
            {hasReservedInstallments ? (
              <CreditValue
                label="Reserved Installments"
                value={formatCurrency(creditCard.reservedInstallmentAmount, {
                  forceDecimals: true,
                })}
                indicatorClassName="bg-muted-foreground/35"
              />
            ) : null}
          </div>
        </div>

        <div className="bg-background rounded-lg p-4">
          <dl className="grid gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground text-xs">Credit Limit</dt>
              <dd className="text-foreground mt-1 font-bold">
                {formatCurrency(creditCard.creditLimit, {
                  forceDecimals: true,
                })}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Closing Day</dt>
              <dd className="text-foreground mt-1 font-bold">
                Day {creditCard.closingDay}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Due Day</dt>
              <dd className="text-foreground mt-1 font-bold">
                Day {creditCard.paymentDueDay}
              </dd>
            </div>
          </dl>

          {creditCard.currentStatement ? (
            <p className="text-muted-foreground mt-4 border-t pt-4 text-sm">
              Current period:{" "}
              <span className="font-semibold">
                {formatDisplayDateRange(
                  creditCard.currentStatement.periodStart,
                  creditCard.currentStatement.periodEnd,
                )}
              </span>
              . Due{" "}
              {formatDisplayDate(creditCard.currentStatement.paymentDueDate)}.
            </p>
          ) : (
            <p className="text-muted-foreground mt-4 border-t pt-4 text-sm">
              No statement activity yet. Card purchases will appear here once
              added.
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="secondary" size="sm">
          <Link href={`/credit-cards/${creditCard.id}`}>See Details</Link>
        </Button>
        <PayCreditCardStatementDialog creditCard={creditCard} />
        <CloseCreditCardStatementDialog creditCard={creditCard} />
      </div>
      {rawCreditCard ? (
        <EditCreditCardDialog
          creditCard={rawCreditCard}
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
        />
      ) : null}
      <ArchiveCreditCardDialog
        creditCard={creditCard}
        open={isArchiveOpen}
        onOpenChange={setIsArchiveOpen}
      />
    </Card>
  )
}

function ArchiveCreditCardDialog({
  creditCard,
  open,
  onOpenChange,
}: {
  creditCard: CreditCard
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { actions } = useFinance()
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

  const setOpen = (nextOpen: boolean) => {
    onOpenChange(nextOpen)

    if (!nextOpen) {
      setStatusMessage("")
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent variant="finance">
        <AlertDialogHeader className="text-left">
          <AlertDialogCloseButton aria-label="Close archive credit card dialog" />
          <AlertDialogTitle variant="finance">
            Archive {creditCard.nickname}?
          </AlertDialogTitle>
          <AlertDialogDescription variant="finance">
            Archiving removes this card from active tracking while keeping its
            statement and transaction history.
          </AlertDialogDescription>
        </AlertDialogHeader>
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

function CreditValue({
  label,
  value,
  indicatorClassName,
}: {
  label: string
  value: string
  indicatorClassName: string
}) {
  return (
    <div className="flex gap-4">
      <div
        aria-hidden="true"
        className={cn("w-1 shrink-0 rounded-full", indicatorClassName)}
      />
      <div>
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="text-foreground mt-1 text-sm font-bold">{value}</p>
      </div>
    </div>
  )
}
