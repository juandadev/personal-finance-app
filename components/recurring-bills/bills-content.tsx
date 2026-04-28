"use client"

import { useState, useMemo } from "react"
import { ArrowUpDown } from "lucide-react"
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
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState<SortOption>("latest")

  const filteredAndSortedBills = useMemo(() => {
    let result = [...bills]

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase()
      result = result.filter((bill) => bill.name.toLowerCase().includes(searchLower))
    }

    // Sort
    switch (sortBy) {
      case "latest":
        result.sort((a, b) => a.dueDay - b.dueDay)
        break
      case "oldest":
        result.sort((a, b) => b.dueDay - a.dueDay)
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

  return (
    <div className="rounded-xl bg-card p-5 md:p-8">
      {/* Filters */}
      <div className="mb-6 flex items-center gap-3 md:gap-4">
        <SearchInput
          value={search}
          onChange={setSearch}
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
      </div>

      {/* Bills Table */}
      <BillsTable bills={filteredAndSortedBills} />
    </div>
  )
}
