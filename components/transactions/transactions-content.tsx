"use client"

import { useMemo, useState } from "react"
import { Card } from "@/components/ui/card"
import { useFinance } from "@/hooks/use-finance"
import type { SortOption, TransactionCategory } from "@/lib/types"
import { SearchInput } from "./search-input"
import { FilterDropdown } from "./filter-dropdown"
import { TransactionsTable } from "./transactions-table"
import { Pagination } from "./pagination"
import FilterMobileIcon from "@/components/icons/FilterMobileIcon"
import SortMobileIcon from "@/components/icons/SortMobileIcon"

const ITEMS_PER_PAGE = 10

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "latest", label: "Latest" },
  { value: "oldest", label: "Oldest" },
  { value: "a-z", label: "A to Z" },
  { value: "z-a", label: "Z to A" },
  { value: "highest", label: "Highest" },
  { value: "lowest", label: "Lowest" },
]

export function TransactionsContent() {
  const { transactions, transactionCategories } = useFinance()
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState<SortOption>("latest")
  const [category, setCategory] = useState<TransactionCategory | "all">("all")
  const [currentPage, setCurrentPage] = useState(1)
  const categoryOptions: {
    value: TransactionCategory | "all"
    label: string
  }[] = [
    { value: "all", label: "All Transactions" },
    ...transactionCategories.map((cat) => ({ value: cat, label: cat })),
  ]

  const filteredAndSorted = useMemo(() => {
    let result = [...transactions]

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase()
      result = result.filter((t) => t.name.toLowerCase().includes(searchLower))
    }

    // Filter by category
    if (category !== "all") {
      result = result.filter((t) => t.category === category)
    }

    // Sort
    switch (sortBy) {
      case "latest":
        result.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        )
        break
      case "oldest":
        result.sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        )
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
  }, [transactions, search, sortBy, category])

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAndSorted.length / ITEMS_PER_PAGE),
  )
  const paginatedTransactions = filteredAndSorted.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  )

  // Reset to page 1 when filters change
  const handleSearchChange = (value: string) => {
    setSearch(value)
    setCurrentPage(1)
  }

  const handleSortChange = (value: SortOption) => {
    setSortBy(value)
    setCurrentPage(1)
  }

  const handleCategoryChange = (value: TransactionCategory | "all") => {
    setCategory(value)
    setCurrentPage(1)
  }

  return (
    <Card className="@container/transactions flex flex-col gap-6">
      <div className="flex items-center gap-6 self-stretch @[806px]/transactions:justify-between">
        <SearchInput
          value={search}
          onChange={handleSearchChange}
          className="w-full @[806px]/transactions:max-w-80"
        />
        <div className="flex items-center gap-6">
          <FilterDropdown
            label="Sort by"
            value={sortBy}
            options={sortOptions}
            onChange={handleSortChange}
            icon={<SortMobileIcon className="size-4" aria-hidden />}
          />
          <FilterDropdown
            label="Category"
            value={category}
            options={categoryOptions}
            onChange={handleCategoryChange}
            icon={<FilterMobileIcon className="size-4" aria-hidden />}
          />
        </div>
      </div>
      <TransactionsTable transactions={paginatedTransactions} />
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </Card>
  )
}
