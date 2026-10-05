"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"

import { MoneyAmount } from "@/components/money-amount"
import { Button } from "@/components/ui/button"
import { CurrencyInput } from "@/components/ui/currency-input"
import {
  Dialog,
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogFinanceForm,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { FormField, FormStatusMessage } from "@/components/ui/form"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useFinance } from "@/hooks/use-finance"
import { getForecastLocalDate } from "@/lib/finance/forecast-period"
import {
  parseNonNegativeDollarCents,
  selectDefaultAdjustmentStatement,
} from "@/lib/finance/statement-adjustment"
import { formatDisplayDateRange } from "@/lib/format"
import type { CreditCard, CreditCardStatement } from "@/lib/types"

interface AdjustCreditCardStatementDialogProps {
  creditCard: CreditCard
  statement?: CreditCardStatement
  trigger?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  hideTrigger?: boolean
}

function toCents(amount: number) {
  return Math.round(amount * 100)
}

export function AdjustCreditCardStatementDialog({
  creditCard,
  statement,
  trigger,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}: AdjustCreditCardStatementDialogProps) {
  const { actions, state } = useFinance()
  const localToday = getForecastLocalDate(
    new Date(),
    state.preferences.timezone,
  )
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const [selectedId, setSelectedId] = useState(statement?.id ?? "")
  const [bankAmount, setBankAmount] = useState("")
  const [note, setNote] = useState("")
  const [statusMessage, setStatusMessage] = useState("")
  const [baselineCents, setBaselineCents] = useState<number | null>(null)
  const [serverTotalCents, setServerTotalCents] = useState<number | null>(null)
  const [isAdjusting, setIsAdjusting] = useState(false)
  const initializedForOpen = useRef(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen
  const unpaidStatements = creditCard.statements.filter(
    (candidate) => candidate.lifecycleStatus !== "paid",
  )
  const selectedStatement = statement
    ? unpaidStatements.find((candidate) => candidate.id === statement.id)
    : unpaidStatements.find((candidate) => candidate.id === selectedId)
  const canAdjust =
    !creditCard.archivedAt &&
    (statement
      ? statement.lifecycleStatus !== "paid"
      : unpaidStatements.length > 0)

  const liveTotalCents = selectedStatement
    ? toCents(selectedStatement.totalAmount)
    : 0
  const pendingCents = selectedStatement
    ? toCents(selectedStatement.pendingBillsAmount)
    : 0
  const shownTotalCents = serverTotalCents ?? liveTotalCents
  const targetCents = parseNonNegativeDollarCents(bankAmount)
  const showStatementPicker = !statement && unpaidStatements.length > 1
  const closesWithoutPayment =
    targetCents === 0 && pendingCents === 0 && shownTotalCents > 0
  const canSubmit =
    selectedStatement !== undefined &&
    targetCents !== null &&
    targetCents >= pendingCents &&
    targetCents !== shownTotalCents &&
    !isAdjusting

  useEffect(() => {
    if (!open) {
      initializedForOpen.current = false
      return
    }

    if (initializedForOpen.current) {
      return
    }

    initializedForOpen.current = true
    const nextStatement =
      statement ??
      selectDefaultAdjustmentStatement(unpaidStatements, localToday)
    setSelectedId(nextStatement?.id ?? "")
    setBankAmount("")
    setNote("")
    setStatusMessage("")
    setServerTotalCents(null)
    setBaselineCents(nextStatement ? toCents(nextStatement.totalAmount) : null)
  }, [localToday, open, statement, unpaidStatements])

  useEffect(() => {
    if (!open || baselineCents === null || serverTotalCents !== null) {
      return
    }

    if (liveTotalCents === baselineCents) {
      return
    }

    setBaselineCents(liveTotalCents)
    setBankAmount("")
    setStatusMessage(
      "This statement changed. Review the new amount and enter what the bank wants again.",
    )
  }, [baselineCents, liveTotalCents, open, serverTotalCents])

  if (!canAdjust) {
    return null
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!isControlled) {
      setUncontrolledOpen(nextOpen)
    }

    onOpenChange?.(nextOpen)
  }

  const handleStatementChange = (nextId: string) => {
    const nextStatement = unpaidStatements.find(
      (candidate) => candidate.id === nextId,
    )
    setSelectedId(nextId)
    setBankAmount("")
    setStatusMessage("")
    setServerTotalCents(null)
    setBaselineCents(nextStatement ? toCents(nextStatement.totalAmount) : 0)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedStatement || targetCents === null || !canSubmit) {
      return
    }

    setIsAdjusting(true)
    setStatusMessage("")

    const result = await actions.adjustCreditCardStatement({
      creditCardId: creditCard.id,
      statementId: selectedStatement.isVirtual ? null : selectedStatement.id,
      periodStart: selectedStatement.periodStart,
      periodEnd: selectedStatement.periodEnd,
      expectedTotalCents: shownTotalCents,
      targetTotalCents: targetCents,
      note: note.trim() ? note.trim() : null,
    })

    setIsAdjusting(false)

    if (!result.ok) {
      if (typeof result.currentTotalCents === "number") {
        setServerTotalCents(result.currentTotalCents)
        setBaselineCents(result.currentTotalCents)
        setBankAmount("")
      }

      setStatusMessage(result.message)
      return
    }

    handleOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!hideTrigger ? (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button size="sm" variant="secondary">
              Adjust Statement
            </Button>
          )}
        </DialogTrigger>
      ) : null}
      <DialogContent variant="finance" showCloseButton={false}>
        <DialogHeader className="text-left">
          <DialogCloseButton aria-label="Close adjust statement dialog" />
          <DialogTitle variant="finance">Adjust Statement</DialogTitle>
          <DialogDescription variant="finance">
            Set this unpaid statement to the amount the bank wants. Purchases
            and bills stay as they are.
          </DialogDescription>
        </DialogHeader>
        <DialogFinanceForm
          onSubmit={handleSubmit}
          actions={
            <>
              {statusMessage ? (
                <FormStatusMessage variant="error">
                  {statusMessage}
                </FormStatusMessage>
              ) : null}
              <Button type="submit" size="finance-submit" disabled={!canSubmit}>
                {isAdjusting ? "Adjusting..." : "Adjust Statement"}
              </Button>
            </>
          }
        >
          {selectedStatement ? (
            <div className="space-y-5">
              {showStatementPicker ? (
                <div className="space-y-2">
                  <Label htmlFor="adjust-statement-period">Statement</Label>
                  <Select
                    value={selectedStatement.id}
                    onValueChange={handleStatementChange}
                  >
                    <SelectTrigger
                      id="adjust-statement-period"
                      variant="form"
                      className="w-full"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {unpaidStatements.map((candidate) => (
                        <SelectItem key={candidate.id} value={candidate.id}>
                          {formatDisplayDateRange(
                            candidate.periodStart,
                            candidate.periodEnd,
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <p className="text-sm">
                  <span className="text-muted-foreground">
                    Statement period{" "}
                  </span>
                  <span className="font-semibold">
                    {formatDisplayDateRange(
                      selectedStatement.periodStart,
                      selectedStatement.periodEnd,
                    )}
                  </span>
                </p>
              )}
              <dl className="bg-background grid gap-3 rounded-lg p-4 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Amount you owe</dt>
                  <dd className="text-right font-bold">
                    <MoneyAmount amount={shownTotalCents / 100} forceDecimals />
                    {pendingCents > 0 ? (
                      <span className="text-muted-foreground mt-1 block text-xs font-normal">
                        incl.{" "}
                        <MoneyAmount
                          amount={pendingCents / 100}
                          forceDecimals
                        />{" "}
                        pending charges
                      </span>
                    ) : null}
                  </dd>
                </div>
              </dl>
              <FormField id="adjust-statement-bank-amount" label="Bank amount">
                {(fieldProps) => (
                  <CurrencyInput
                    {...fieldProps}
                    value={bankAmount}
                    onChange={(event) => setBankAmount(event.target.value)}
                  />
                )}
              </FormField>
              {targetCents !== null && targetCents < pendingCents ? (
                <p className="text-destructive text-sm">
                  Enter an amount that covers the pending charges.
                </p>
              ) : null}
              {targetCents !== null &&
              targetCents !== shownTotalCents &&
              targetCents >= pendingCents ? (
                <p className="text-sm">
                  You will owe{" "}
                  <MoneyAmount
                    amount={Math.abs(targetCents - shownTotalCents) / 100}
                    forceDecimals
                    className="font-bold"
                  />{" "}
                  {targetCents > shownTotalCents ? "more" : "less"}.
                </p>
              ) : null}
              {closesWithoutPayment ? (
                <p className="text-muted-foreground text-sm">
                  This will close the statement without a payment.
                </p>
              ) : null}
              <FormField id="adjust-statement-note" label="Note">
                {(fieldProps) => (
                  <Textarea
                    {...fieldProps}
                    value={note}
                    maxLength={240}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Optional, such as Points or Exchange rate"
                  />
                )}
              </FormField>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              This statement is no longer unpaid.
            </p>
          )}
        </DialogFinanceForm>
      </DialogContent>
    </Dialog>
  )
}
