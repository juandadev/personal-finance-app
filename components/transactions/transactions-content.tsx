"use client"

import { useMemo, useState } from "react"
import {
  FunnelIcon,
  ReceiptIcon,
  ArrowsDownUpIcon,
} from "@phosphor-icons/react"
import { EmptyDataCard } from "@/components/empty-data-card"
import { Card } from "@/components/ui/card"
import { useFinance } from "@/hooks/use-finance"
import type { SortOption, TransactionCategory } from "@/lib/types"
import { SearchInput } from "./search-input"
import { FilterDropdown } from "./filter-dropdown"
import { TransactionsTable } from "./transactions-table"
import { Pagination } from "./pagination"
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

    if (search) {
      const searchLower = search.toLowerCase()
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(searchLower) ||
          t.concept.toLowerCase().includes(searchLower),
      )
    }

    if (category !== "all") {
      result = result.filter((t) => t.category === category)
    }

    switch (sortBy) {
      case "latest":
        result.sort((a, b) => b.postedAt.localeCompare(a.postedAt))
        break
      case "oldest":
        result.sort((a, b) => a.postedAt.localeCompare(b.postedAt))
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

  const totalPages = Math.ceil(filteredAndSorted.length / ITEMS_PER_PAGE)
  const paginatedTransactions = filteredAndSorted.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  )
  const hasTransactions = transactions.length > 0
  const hasVisibleTransactions = filteredAndSorted.length > 0

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
            icon={
              <ArrowsDownUpIcon weight="fill" className="size-4" aria-hidden />
            }
          />
          <FilterDropdown
            label="Category"
            value={category}
            options={categoryOptions}
            onChange={handleCategoryChange}
            icon={<FunnelIcon weight="fill" className="size-4" aria-hidden />}
          />
        </div>
      </div>
      {hasVisibleTransactions ? (
        <>
          <TransactionsTable transactions={paginatedTransactions} />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </>
      ) : (
        <EmptyDataCard
          className="min-h-90"
          icon={<ReceiptIcon weight="fill" className="size-5" aria-hidden />}
          title={
            hasTransactions ? "No Matching Transactions" : "No Transactions Yet"
          }
          description={
            hasTransactions
              ? "Try a different search term or category to find more activity."
              : "There is no transaction data available to show yet. New activity will appear here once it has been added."
          }
        />
      )}
    </Card>
  )
}
