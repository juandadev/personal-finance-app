"use client"

import { useMemo } from "react"
import { CalendarDotsIcon, SortAscendingIcon } from "@phosphor-icons/react"
import { useQueryStates } from "nuqs"
import { EmptyDataCard } from "@/components/empty-data-card"
import { ResetUrlFiltersButton } from "@/components/reset-url-filters-button"
import { Card } from "@/components/ui/card"
import {
  filterRecurringBills,
  hasActiveRecurringBillQuery,
  normalizeRecurringBillFilters,
  recurringBillQueryParsers,
} from "@/lib/finance/url-filters"
import type { RecurringBill, SortOption } from "@/lib/types"
import { SearchInput } from "../transactions/search-input"
import { FilterDropdown } from "../transactions/filter-dropdown"
import { BillsTable } from "./bills-table"

interface BillsContentProps {
  bills: RecurringBill[]
}

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "latest", label: "Latest" },
  { value: "oldest", label: "Oldest" },
  { value: "a-z", label: "A to Z" },
  { value: "z-a", label: "Z to A" },
  { value: "highest", label: "Highest" },
  { value: "lowest", label: "Lowest" },
]

export function BillsContent({ bills }: BillsContentProps) {
  const [query, setQuery] = useQueryStates(recurringBillQueryParsers)
  const filters = useMemo(() => normalizeRecurringBillFilters(query), [query])
  const hasActiveQuery = hasActiveRecurringBillQuery(query)
  const filteredAndSortedBills = useMemo(
    () => filterRecurringBills(bills, filters),
    [bills, filters],
  )
  const activeBills = filteredAndSortedBills.filter((bill) => !bill.archivedAt)
  const archivedBills = filteredAndSortedBills.filter((bill) =>
    Boolean(bill.archivedAt),
  )
  const hasBills = bills.length > 0
  const hasVisibleBills = filteredAndSortedBills.length > 0

  const handleSearchChange = (value: string) => {
    void setQuery({ q: value || null })
  }

  const handleSortChange = (value: SortOption) => {
    void setQuery({ sort: value })
  }

  const handleReset = () => {
    void setQuery(null)
  }

  return (
    <Card className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="mb-6 flex shrink-0 items-end gap-3 md:gap-4">
        <SearchInput
          value={filters.q}
          onChange={handleSearchChange}
          label="Search Bills"
          placeholder="Search bills"
          className="flex-1 md:flex-initial"
        />
        <FilterDropdown
          label="Sort by"
          value={filters.sort}
          options={sortOptions}
          onChange={handleSortChange}
          icon={
            <SortAscendingIcon weight="fill" className="size-5" aria-hidden />
          }
        />
        {hasActiveQuery ? (
          <ResetUrlFiltersButton onReset={handleReset} />
        ) : null}
      </div>

      {hasVisibleBills ? (
        <div className="min-h-0 flex-1 space-y-8 overflow-y-auto pr-3">
          {activeBills.length > 0 ? <BillsTable bills={activeBills} /> : null}
          {archivedBills.length > 0 ? (
            <div>
              <h3 className="text-muted-foreground text-sm font-bold">
                Archived
              </h3>
              <BillsTable bills={archivedBills} />
            </div>
          ) : null}
        </div>
      ) : (
        <EmptyDataCard
          className="min-h-90"
          icon={
            <CalendarDotsIcon weight="fill" className="size-5" aria-hidden />
          }
          title={hasBills ? "No Matching Bills" : "No Recurring Bills Yet"}
          description={
            hasBills
              ? "Try a different search term to find another scheduled bill."
              : "Add a recurring bill to track subscriptions, financing, and other scheduled payments with due dates and payment status."
          }
        />
      )}
    </Card>
  )
}
