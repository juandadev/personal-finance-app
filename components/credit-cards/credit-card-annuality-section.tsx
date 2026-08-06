"use client"

import { useState } from "react"

import { HeaderMenuItem, ItemActions } from "@/components/actions"
import { MoneyAmount } from "@/components/money-amount"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CurrencyInput } from "@/components/ui/currency-input"
import { FormStatusMessage } from "@/components/ui/form"
import { useFinance } from "@/hooks/use-finance"
import { formatDollarInput, parseDollarAmount } from "@/lib/finance/form-utils"
import { formatDisplayDateRange } from "@/lib/format"
import type { CreditCard } from "@/lib/types"

export function CreditCardAnnualitySection({
  creditCard,
}: {
  creditCard: CreditCard
}) {
  const { actions } = useFinance()
  const schedule = creditCard.annualitySchedule
  const anniversaryYear = schedule[0]?.anniversaryYear
  const [draftAmounts, setDraftAmounts] = useState<Record<number, string>>({})
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  if (!creditCard.annualityEnabled || creditCard.annualityAmount == null) {
    return null
  }

  const canEditAmounts =
    (creditCard.annualityPaymentCount ?? 1) > 1 && anniversaryYear != null
  const draftSumCents = schedule.reduce((sum, item) => {
    if (item.isMaterialized) {
      return sum + Math.round(item.amount * 100)
    }

    const parsed = parseDollarAmount(
      draftAmounts[item.installmentIndex] ?? formatDollarInput(item.amount),
    )

    return sum + (parsed ?? 0)
  }, 0)
  const expectedCents = Math.round(creditCard.annualityAmount * 100)
  const sumMatches = draftSumCents === expectedCents
  const anniversaryLabel =
    creditCard.annualityAnniversaryMonth != null &&
    creditCard.annualityAnniversaryDay != null
      ? `Anniversary ${creditCard.annualityAnniversaryMonth}/${creditCard.annualityAnniversaryDay}`
      : null
  const paymentsLabel =
    creditCard.annualityPaymentCount != null
      ? `${creditCard.annualityPaymentCount} payment${creditCard.annualityPaymentCount === 1 ? "" : "s"}`
      : null

  async function handleReset() {
    if (anniversaryYear == null) {
      return
    }

    setIsSaving(true)
    setStatusMessage(null)
    const result = await actions.resetCreditCardAnnualityOverrides(
      creditCard.id,
      anniversaryYear,
    )
    setIsSaving(false)

    if (!result.ok) {
      setStatusMessage(result.message)
    } else {
      setDraftAmounts({})
    }
  }

  async function handleSave() {
    if (anniversaryYear == null || !sumMatches) {
      return
    }

    const overrides = schedule
      .filter((item) => !item.isMaterialized)
      .map((item) => {
        const amountCents = parseDollarAmount(
          draftAmounts[item.installmentIndex] ?? formatDollarInput(item.amount),
        )

        return {
          installmentIndex: item.installmentIndex,
          amountCents: amountCents ?? 0,
        }
      })
      .filter((item) => item.amountCents > 0)

    setIsSaving(true)
    setStatusMessage(null)
    const result = await actions.saveCreditCardAnnualityOverrides(
      creditCard.id,
      anniversaryYear,
      overrides,
    )
    setIsSaving(false)

    if (!result.ok) {
      setStatusMessage(result.message)
    } else {
      setDraftAmounts({})
    }
  }

  return (
    <Card padding="fixed">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-bold tracking-tight">Annuality</h2>
          <div className="text-muted-foreground mt-1 space-y-1 text-sm">
            <p>
              <MoneyAmount amount={creditCard.annualityAmount} forceDecimals />{" "}
              / year
            </p>
            {anniversaryLabel || paymentsLabel ? (
              <p>
                {[anniversaryLabel, paymentsLabel].filter(Boolean).join(" · ")}
              </p>
            ) : null}
          </div>
        </div>
        {canEditAmounts ? (
          <>
            <div className="hidden shrink-0 flex-wrap gap-2 md:flex">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isSaving || anniversaryYear == null}
                onClick={() => {
                  void handleReset()
                }}
              >
                Reset to equal
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isSaving || !sumMatches || anniversaryYear == null}
                onClick={() => {
                  void handleSave()
                }}
              >
                {isSaving ? "Saving..." : "Save amounts"}
              </Button>
            </div>
            <div className="md:hidden">
              <ItemActions
                ariaLabel="Annuality actions"
                disabled={isSaving || anniversaryYear == null}
              >
                <HeaderMenuItem
                  disabled={isSaving || anniversaryYear == null}
                  onSelect={() => {
                    void handleReset()
                  }}
                >
                  Reset to equal
                </HeaderMenuItem>
                <HeaderMenuItem
                  disabled={isSaving || !sumMatches || anniversaryYear == null}
                  onSelect={() => {
                    void handleSave()
                  }}
                >
                  Save amounts
                </HeaderMenuItem>
              </ItemActions>
            </div>
          </>
        ) : null}
      </div>

      {schedule.length > 0 ? (
        <div className="divide-muted-foreground/10 mt-4 divide-y">
          {schedule.map((item) => (
            <div
              key={`${item.anniversaryYear}:${item.installmentIndex}`}
              className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            >
              <div className="min-w-0 sm:flex-1">
                <p className="text-sm font-bold">
                  Payment {item.installmentIndex}
                  {item.isMaterialized ? (
                    <span className="text-muted-foreground ml-2 text-xs font-normal">
                      posted
                    </span>
                  ) : item.status === "pending" ? (
                    <span className="text-muted-foreground ml-2 text-xs font-normal">
                      pending
                    </span>
                  ) : null}
                </p>
                <p className="text-muted-foreground text-xs">
                  {formatDisplayDateRange(item.periodStart, item.periodEnd)}
                </p>
              </div>
              {canEditAmounts && !item.isMaterialized ? (
                <div className="w-full sm:w-35 sm:shrink-0">
                  <CurrencyInput
                    aria-label={`Annuality payment ${item.installmentIndex} amount`}
                    value={
                      draftAmounts[item.installmentIndex] ??
                      formatDollarInput(item.amount)
                    }
                    onChange={(event) =>
                      setDraftAmounts((current) => ({
                        ...current,
                        [item.installmentIndex]: event.target.value,
                      }))
                    }
                  />
                </div>
              ) : (
                <p className="text-sm font-bold sm:shrink-0">
                  <MoneyAmount amount={item.amount} forceDecimals />
                </p>
              )}
            </div>
          ))}
        </div>
      ) : null}

      {canEditAmounts ? (
        <p className="text-muted-foreground mt-3 text-xs">
          Overrides apply to this anniversary year only. Sum{" "}
          <MoneyAmount amount={draftSumCents / 100} forceDecimals />
          {sumMatches ? " ✓" : " (must match full annual amount)"}
        </p>
      ) : null}

      {statusMessage ? (
        <FormStatusMessage variant="error" className="mt-3">
          {statusMessage}
        </FormStatusMessage>
      ) : null}
    </Card>
  )
}
