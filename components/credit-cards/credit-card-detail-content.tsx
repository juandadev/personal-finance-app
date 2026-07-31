"use client"

import Link from "next/link"
import { useState, type ReactNode } from "react"
import { ArrowLeftIcon, CaretRightIcon, LockIcon } from "@phosphor-icons/react"

import {
  HeaderMenuItem,
  ItemActions,
  ModuleHeaderActions,
} from "@/components/actions"
import { CloseCreditCardStatementDialog } from "@/components/credit-cards/close-credit-card-statement-dialog"
import { CreditCardBadge } from "@/components/credit-cards/credit-card-badge"
import { PayCreditCardStatementDialog } from "@/components/credit-cards/pay-credit-card-statement-dialog"
import {
  AddScheduledCreditCardChargeDialog,
  EditScheduledCreditCardChargeDialog,
} from "@/components/credit-cards/scheduled-credit-card-charge-dialog"
import { EmptyDataCard } from "@/components/empty-data-card"
import { MoneyAmount } from "@/components/money-amount"
import { PrivacyValue } from "@/components/privacy-value"
import { EditBillDialog } from "@/components/recurring-bills/bill-dialog"
import { Button } from "@/components/ui/button"
import { Card, cardActionLinkClasses } from "@/components/ui/card"
import { useFinance } from "@/hooks/use-finance"
import { formatDisplayDate, formatDisplayDateRange } from "@/lib/format"
import type {
  BillStatus,
  CreditCard,
  CreditCardDueStatus,
  RecurringBill,
} from "@/lib/types"
import { cn } from "@/lib/utils"

const statusLabels: Record<CreditCardDueStatus, string> = {
  upcoming: "Upcoming",
  "due-soon": "Due Soon",
  "due-today": "Due Today",
  overdue: "Overdue",
  paid: "Paid",
}

const billStatusLabels: Record<BillStatus, string> = {
  paid: "Paid",
  skipped: "Skipped",
  upcoming: "Upcoming",
  "due-soon": "Due Soon",
  "due-today": "Due Today",
  overdue: "Overdue",
}

function statusClassName(status: CreditCardDueStatus) {
  return status === "overdue" || status === "due-today"
    ? "text-destructive"
    : status === "paid"
      ? "text-accent"
      : "text-muted-foreground"
}

function billOccurrenceStatusClassName(status: BillStatus) {
  return status === "overdue"
    ? "text-destructive"
    : status === "due-soon" || status === "due-today"
      ? "text-warning"
      : "text-muted-foreground"
}

function nextBillDueDate(bill: RecurringBill) {
  return bill.currentOccurrence?.dueDate ?? bill.firstDueDate
}

function sortCardRecurringBills(left: RecurringBill, right: RecurringBill) {
  const leftArchived = Boolean(left.archivedAt)
  const rightArchived = Boolean(right.archivedAt)
  if (leftArchived !== rightArchived) {
    return leftArchived ? 1 : -1
  }
  return nextBillDueDate(left).localeCompare(nextBillDueDate(right))
}

export function CreditCardDetailContent({
  creditCardId,
}: {
  creditCardId: string
}) {
  const { creditCards, recurringBills } = useFinance()
  const [isScheduledChargeDialogOpen, setIsScheduledChargeDialogOpen] =
    useState(false)
  const [isMobilePayDialogOpen, setIsMobilePayDialogOpen] = useState(false)
  const [isCloseStatementDialogOpen, setIsCloseStatementDialogOpen] =
    useState(false)
  const creditCard = creditCards.find((card) => card.id === creditCardId)

  if (!creditCard) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto pr-3">
        <EmptyDataCard
          className="min-h-90"
          icon={<LockIcon weight="fill" className="size-5" aria-hidden />}
          title="Credit Card Not Found"
          description="This card may have been archived or removed."
        />
      </div>
    )
  }

  const scheduledCharges = recurringBills.filter(
    (bill) =>
      bill.frequency === "one_time" &&
      bill.creditCardId === creditCard.id &&
      !bill.archivedAt &&
      bill.currentOccurrence?.status !== "paid" &&
      bill.currentOccurrence?.status !== "skipped",
  )
  const cardRecurringBills = recurringBills
    .filter(
      (bill) =>
        bill.creditCardId === creditCard.id &&
        (bill.frequency === "monthly" || bill.frequency === "yearly"),
    )
    .toSorted(sortCardRecurringBills)
  const hasReservedInstallments = creditCard.reservedInstallmentAmount > 0
  const canPayStatement = Boolean(
    creditCard.oldestPayableStatement &&
    creditCard.oldestPayableStatement.lifecycleStatus !== "paid" &&
    creditCard.oldestPayableStatement.totalAmount > 0,
  )
  const canCloseStatement = Boolean(
    creditCard.currentStatement &&
    creditCard.currentStatement.lifecycleStatus !== "paid" &&
    creditCard.currentStatement.totalAmount === 0,
  )

  return (
    <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pr-3">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href="/credit-cards">
          <ArrowLeftIcon weight="fill" className="size-4" aria-hidden />
          Back to Credit Cards
        </Link>
      </Button>

      <Card className="space-y-6" padding="fixed">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <CreditCardBadge
              nickname={creditCard.nickname}
              initials={creditCard.initials}
              color={creditCard.color}
            />
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                <PrivacyValue hiddenLabel="Card name hidden. Turn off privacy mode to show it.">
                  {creditCard.nickname}
                </PrivacyValue>
              </h2>
              <p className="text-muted-foreground text-sm">
                <PrivacyValue hiddenLabel="Card details hidden. Turn off privacy mode to show it.">
                  {creditCard.issuer} {creditCard.network} ••••{" "}
                  {creditCard.lastFour}
                </PrivacyValue>
              </p>
            </div>
          </div>
          <ModuleHeaderActions
            ariaLabel={`Actions for ${creditCard.nickname}`}
            primaryAction={
              canPayStatement ? (
                <PayCreditCardStatementDialog creditCard={creditCard} />
              ) : undefined
            }
            primaryMenuItem={
              canPayStatement ? (
                <HeaderMenuItem onSelect={() => setIsMobilePayDialogOpen(true)}>
                  Pay Statement
                </HeaderMenuItem>
              ) : undefined
            }
          >
            <HeaderMenuItem
              onSelect={() => setIsScheduledChargeDialogOpen(true)}
            >
              Add Scheduled Charge
            </HeaderMenuItem>
            {canCloseStatement ? (
              <HeaderMenuItem
                onSelect={() => setIsCloseStatementDialogOpen(true)}
              >
                Close Statement
              </HeaderMenuItem>
            ) : null}
          </ModuleHeaderActions>
        </div>

        <div
          className={cn(
            "grid gap-3",
            hasReservedInstallments ? "md:grid-cols-4" : "md:grid-cols-3",
          )}
        >
          <Metric
            label="Total Pending"
            value={
              <MoneyAmount
                amount={creditCard.totalPendingAmount}
                forceDecimals
              />
            }
            status={creditCard.dueStatus}
          />
          <Metric
            label="Available Credit"
            value={
              <MoneyAmount amount={creditCard.availableCredit} forceDecimals />
            }
            valueClassName={
              creditCard.availableCredit < 0 ? "text-destructive" : undefined
            }
          />
          {hasReservedInstallments ? (
            <Metric
              label="Reserved Installments"
              value={
                <MoneyAmount
                  amount={creditCard.reservedInstallmentAmount}
                  forceDecimals
                />
              }
            />
          ) : null}
          <Metric
            label="Credit Limit"
            value={
              <MoneyAmount amount={creditCard.creditLimit} forceDecimals />
            }
          />
        </div>
      </Card>

      <PayCreditCardStatementDialog
        creditCard={creditCard}
        open={isMobilePayDialogOpen}
        onOpenChange={setIsMobilePayDialogOpen}
        hideTrigger
      />
      <AddScheduledCreditCardChargeDialog
        creditCard={creditCard}
        open={isScheduledChargeDialogOpen}
        onOpenChange={setIsScheduledChargeDialogOpen}
      />
      <CloseCreditCardStatementDialog
        creditCard={creditCard}
        open={isCloseStatementDialogOpen}
        onOpenChange={setIsCloseStatementDialogOpen}
        hideTrigger
      />
      <ScheduledChargesCard
        creditCard={creditCard}
        scheduledCharges={scheduledCharges}
      />
      <RecurringBillsCard creditCard={creditCard} bills={cardRecurringBills} />
      <StatementsCard creditCard={creditCard} />
      <PaymentsCard creditCard={creditCard} />
    </div>
  )
}

function ScheduledChargesCard({
  creditCard,
  scheduledCharges,
}: {
  creditCard: CreditCard
  scheduledCharges: RecurringBill[]
}) {
  const [editingCharge, setEditingCharge] = useState<RecurringBill | null>(null)

  if (scheduledCharges.length === 0) {
    return null
  }

  return (
    <Card padding="fixed">
      <h2 className="text-xl font-bold tracking-tight">Scheduled Charges</h2>
      <div className="divide-muted-foreground/10 mt-4 divide-y">
        {scheduledCharges.map((charge) => {
          const occurrence = charge.currentOccurrence

          return (
            <div
              key={charge.id}
              className="flex items-center justify-between gap-4 py-4"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{charge.concept}</p>
                <p className="text-muted-foreground text-xs">
                  {charge.name} · Charges{" "}
                  {formatDisplayDate(charge.firstDueDate)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <div className="text-right">
                  <p className="text-sm font-bold">
                    <MoneyAmount amount={charge.amount * -1} variant="signed" />
                  </p>
                  {occurrence ? (
                    <p
                      className={cn(
                        "text-xs font-bold",
                        billOccurrenceStatusClassName(occurrence.status),
                      )}
                    >
                      {billStatusLabels[occurrence.status]}
                    </p>
                  ) : null}
                </div>
                <ItemActions ariaLabel={`More options for ${charge.concept}`}>
                  <HeaderMenuItem onSelect={() => setEditingCharge(charge)}>
                    Edit Scheduled Charge
                  </HeaderMenuItem>
                </ItemActions>
              </div>
            </div>
          )
        })}
      </div>
      {editingCharge ? (
        <EditScheduledCreditCardChargeDialog
          bill={editingCharge}
          creditCard={creditCard}
          open
          onOpenChange={(open) => {
            if (!open) {
              setEditingCharge(null)
            }
          }}
        />
      ) : null}
    </Card>
  )
}

function RecurringBillsCard({
  creditCard,
  bills,
}: {
  creditCard: CreditCard
  bills: RecurringBill[]
}) {
  const [editingBill, setEditingBill] = useState<RecurringBill | null>(null)

  if (bills.length === 0) {
    return null
  }

  return (
    <Card padding="fixed">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold tracking-tight">Recurring Bills</h2>
        <Link
          href={`/recurring-bills?card=${encodeURIComponent(creditCard.id)}`}
          className={cardActionLinkClasses}
        >
          Manage recurring bills
          <CaretRightIcon weight="fill" className="size-2" aria-hidden />
        </Link>
      </div>
      <div className="divide-muted-foreground/10 mt-4 divide-y">
        {bills.map((bill) => {
          const occurrence = bill.currentOccurrence
          const isArchived = Boolean(bill.archivedAt)
          const frequencyLabel =
            bill.frequency === "yearly" ? "Yearly" : "Monthly"

          return (
            <div
              key={bill.id}
              className={cn(
                "flex items-center justify-between gap-4 py-4",
                isArchived && "opacity-70",
              )}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{bill.concept}</p>
                <p className="text-muted-foreground text-xs">
                  {bill.name} · {frequencyLabel} · Due{" "}
                  {formatDisplayDate(nextBillDueDate(bill))}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <div className="text-right">
                  <p className="text-sm font-bold">
                    <MoneyAmount amount={bill.amount * -1} variant="signed" />
                  </p>
                  {occurrence ? (
                    <p
                      className={cn(
                        "text-xs font-bold",
                        billOccurrenceStatusClassName(occurrence.status),
                      )}
                    >
                      {billStatusLabels[occurrence.status]}
                    </p>
                  ) : null}
                </div>
                {!isArchived ? (
                  <ItemActions ariaLabel={`More options for ${bill.concept}`}>
                    <HeaderMenuItem onSelect={() => setEditingBill(bill)}>
                      Edit
                    </HeaderMenuItem>
                  </ItemActions>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
      {editingBill ? (
        <EditBillDialog
          bill={editingBill}
          open
          onOpenChange={(open) => {
            if (!open) {
              setEditingBill(null)
            }
          }}
        />
      ) : null}
    </Card>
  )
}

function StatementsCard({ creditCard }: { creditCard: CreditCard }) {
  return (
    <Card padding="fixed">
      <h2 className="text-xl font-bold tracking-tight">Statements</h2>
      {creditCard.statements.length > 0 ? (
        <div className="divide-muted-foreground/10 mt-4 divide-y">
          {creditCard.statements.map((statement) => (
            <div
              key={statement.id}
              className="flex flex-col gap-2 py-4 sm:flex-row sm:items-stretch sm:justify-between"
            >
              <div className="flex flex-col justify-between gap-3">
                <div>
                  <p className="text-sm font-bold">
                    {formatDisplayDateRange(
                      statement.periodStart,
                      statement.periodEnd,
                    )}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Due {formatDisplayDate(statement.paymentDueDate)}
                  </p>
                </div>
                {statement.amount > 0 || statement.pendingBillsAmount > 0 ? (
                  <Link
                    href={`/transactions?card=${encodeURIComponent(creditCard.id)}&from=${encodeURIComponent(statement.periodStart)}&to=${encodeURIComponent(statement.periodEnd)}`}
                    className={cardActionLinkClasses}
                  >
                    View statement transactions
                    <CaretRightIcon
                      weight="fill"
                      className="size-2"
                      aria-hidden
                    />
                  </Link>
                ) : null}
              </div>
              <div className="flex flex-col items-start gap-2 sm:items-end">
                <p className="text-sm font-bold">
                  <MoneyAmount amount={statement.totalAmount} forceDecimals />
                  {statement.pendingBillsAmount > 0 ? (
                    <span className="text-muted-foreground ml-1 text-xs font-normal">
                      incl.{" "}
                      <MoneyAmount
                        amount={statement.pendingBillsAmount}
                        forceDecimals
                      />{" "}
                      pending bills
                    </span>
                  ) : null}
                </p>
                <p
                  className={cn(
                    "text-xs font-bold",
                    statusClassName(statement.dueStatus),
                  )}
                >
                  {statement.lifecycleStatus === "paid" ? (
                    <LockIcon
                      weight="fill"
                      className="mr-1 inline size-3"
                      aria-hidden
                    />
                  ) : null}
                  {statusLabels[statement.dueStatus]}
                </p>
                <PayCreditCardStatementDialog
                  creditCard={creditCard}
                  statement={statement}
                />
                <CloseCreditCardStatementDialog
                  creditCard={creditCard}
                  statement={statement}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground mt-4 text-sm">
          No statements yet. Credit-card purchases will create statement
          activity.
        </p>
      )}
    </Card>
  )
}

function PaymentsCard({ creditCard }: { creditCard: CreditCard }) {
  return (
    <Card padding="fixed">
      <h2 className="text-xl font-bold tracking-tight">Payment History</h2>
      {creditCard.payments.length > 0 ? (
        <div className="divide-muted-foreground/10 mt-4 divide-y">
          {creditCard.payments.map((payment) => (
            <div
              key={payment.id}
              className="flex items-center justify-between gap-4 py-4"
            >
              <div>
                <p className="text-sm font-bold">Statement Payment</p>
                <p className="text-muted-foreground text-xs">
                  {formatDisplayDate(payment.paidAt)}
                </p>
              </div>
              <p className="text-sm font-bold">
                <MoneyAmount amount={payment.amount} forceDecimals />
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground mt-4 text-sm">
          No statement payments have been recorded yet.
        </p>
      )}
    </Card>
  )
}

function Metric({
  label,
  value,
  status,
  valueClassName,
}: {
  label: string
  value: ReactNode
  status?: CreditCardDueStatus
  valueClassName?: string
}) {
  return (
    <div className="bg-background rounded-lg p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs">{label}</p>
        {status ? (
          <p className={cn("text-xs font-bold", statusClassName(status))}>
            {statusLabels[status]}
          </p>
        ) : null}
      </div>
      <p
        className={cn("text-foreground mt-1 text-sm font-bold", valueClassName)}
      >
        {value}
      </p>
    </div>
  )
}
