"use client"

import { useState, useMemo } from "react"
import { ArrowUpDown, CalendarClock } from "lucide-react"
import { EmptyDataCard } from "@/components/empty-data-card"
import { AddBillDialog } from "@/components/recurring-bills/bill-dialog"
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
        result.sort((a, b) => nextDueDate(a).localeCompare(nextDueDate(b)))
        break
      case "oldest":
        result.sort((a, b) => nextDueDate(b).localeCompare(nextDueDate(a)))
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
    <Card>
      <div className="mb-6 flex items-end gap-3 md:gap-4">
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
          icon={<ArrowUpDown className="size-5" aria-hidden />}
        />
        <div className="ml-auto">
          <AddBillDialog />
        </div>
      </div>

      {hasVisibleBills ? (
        <div className="space-y-8">
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
          icon={<CalendarClock className="size-5" aria-hidden />}
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
