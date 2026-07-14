"use client"

import { useState, useMemo } from "react"
import { CalendarDotsIcon, SortAscendingIcon } from "@phosphor-icons/react"
import { EmptyDataCard } from "@/components/empty-data-card"
import { Card } from "@/components/ui/card"
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

function nextDueDate(bill: RecurringBill) {
  return bill.currentOccurrence?.dueDate ?? bill.firstDueDate
}

const latestSortStatusPriority: Partial<
  Record<RecurringBill["status"], number>
> = {
  overdue: 0,
  "due-today": 1,
  "due-soon": 2,
  upcoming: 3,
}

function latestSortStatusRank(bill: RecurringBill) {
  return latestSortStatusPriority[bill.status] ?? Number.POSITIVE_INFINITY
}

function compareLatestBills(left: RecurringBill, right: RecurringBill) {
  const statusComparison =
    latestSortStatusRank(left) - latestSortStatusRank(right)

  if (statusComparison !== 0) {
    return statusComparison
  }

  return nextDueDate(right).localeCompare(nextDueDate(left))
}

export function BillsContent({ bills }: BillsContentProps) {
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState<SortOption>("latest")

  const filteredAndSortedBills = useMemo(() => {
    let result = [...bills]

    if (search) {
      const searchLower = search.toLowerCase()
      result = result.filter((bill) =>
        bill.name.toLowerCase().includes(searchLower),
      )
    }

    switch (sortBy) {
      case "latest":
        result.sort(compareLatestBills)
        break
      case "oldest":
        result.sort((a, b) => nextDueDate(a).localeCompare(nextDueDate(b)))
        break
      case "a-z":
        result.sort((a, b) => a.name.localeCompare(b.name))
        break
      case "z-a":
        result.sort((a, b) => b.name.localeCompare(a.name))
        break
      case "highest":
        result.sort((a, b) => b.amount - a.amount)
        break
      case "lowest":
        result.sort((a, b) => a.amount - b.amount)
        break
    }

    return result
  }, [bills, search, sortBy])
  const activeBills = filteredAndSortedBills.filter((bill) => !bill.archivedAt)
  const archivedBills = filteredAndSortedBills.filter((bill) =>
    Boolean(bill.archivedAt),
  )
  const hasBills = bills.length > 0
  const hasVisibleBills = filteredAndSortedBills.length > 0

  return (
    <Card className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="mb-6 flex shrink-0 items-end gap-3 md:gap-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          label="Search Bills"
          placeholder="Search bills"
          className="flex-1 md:flex-initial"
        />
        <FilterDropdown
          label="Sort by"
          value={sortBy}
          options={sortOptions}
          onChange={setSortBy}
          icon={
            <SortAscendingIcon weight="fill" className="size-5" aria-hidden />
          }
        />
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
