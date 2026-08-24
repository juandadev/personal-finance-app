"use client"

import { useMemo } from "react"
import {
  FunnelIcon,
  ReceiptIcon,
  SortAscendingIcon,
} from "@phosphor-icons/react"
import { useQueryStates } from "nuqs"
import { EmptyDataCard } from "@/components/empty-data-card"
import { ResetUrlFiltersButton } from "@/components/reset-url-filters-button"
import { Card } from "@/components/ui/card"
import {
  hasActiveTransactionQuery,
  normalizeTransactionFilters,
  transactionQueryParsers,
} from "@/lib/finance/url-filters"
import type { TransactionFilterOption } from "@/lib/finance/transaction-page-query"
import type { SortOption, Transaction } from "@/lib/types"
import { SearchInput } from "./search-input"
import { FilterDropdown } from "./filter-dropdown"
import { TransactionsTable } from "./transactions-table"
import { Pagination } from "./pagination"

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "latest", label: "Latest" },
  { value: "oldest", label: "Oldest" },
  { value: "a-z", label: "A to Z" },
  { value: "z-a", label: "Z to A" },
  { value: "highest", label: "Highest" },
  { value: "lowest", label: "Lowest" },
]

interface TransactionsContentProps {
  transactions: Transaction[]
  totalCount: number
  totalTransactionCount: number
  pagination: {
    safePage: number
    totalPages: number
  }
  categoryOptions: TransactionFilterOption[]
}

export function TransactionsContent({
  transactions,
  totalCount,
  totalTransactionCount,
  pagination,
  categoryOptions: availableCategories,
}: TransactionsContentProps) {
  const [query, setQuery] = useQueryStates(transactionQueryParsers)
  const filters = useMemo(() => normalizeTransactionFilters(query), [query])
  const hasActiveQuery = hasActiveTransactionQuery(query)
  const selectedCategory =
    filters.category.length === 1 ? filters.category[0] : "all"
  const categoryOptions: TransactionFilterOption[] = [
    { value: "all", label: "All Transactions" },
    ...availableCategories,
  ]
  const hasTransactions = totalTransactionCount > 0
  const hasVisibleTransactions = totalCount > 0

  const handleSearchChange = (value: string) => {
    void setQuery({ q: value || null, page: 1 })
  }

  const handleSortChange = (value: SortOption) => {
    void setQuery({ sort: value, page: 1 })
  }

  const handleCategoryChange = (value: string) => {
    void setQuery({
      category: value === "all" ? null : [value],
      page: 1,
    })
  }

  const handlePageChange = (page: number) => {
    void setQuery({ page })
  }

  const handleReset = () => {
    void setQuery(null)
  }

  return (
    <Card className="@container/transactions flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="mb-6 flex shrink-0 items-center gap-6 self-stretch @[806px]/transactions:justify-between">
        <SearchInput
          key={filters.q}
          value={filters.q}
          onChange={handleSearchChange}
          className="w-full @[806px]/transactions:max-w-80"
        />
        <div className="flex items-center gap-4">
          <FilterDropdown
            label="Sort by"
            value={filters.sort}
            options={sortOptions}
            onChange={handleSortChange}
            icon={
              <SortAscendingIcon weight="fill" className="size-5" aria-hidden />
            }
          />
          <FilterDropdown
            label="Category"
            value={selectedCategory}
            options={categoryOptions}
            onChange={handleCategoryChange}
            icon={<FunnelIcon weight="fill" className="size-5" aria-hidden />}
          />
          {hasActiveQuery ? (
            <ResetUrlFiltersButton onReset={handleReset} />
          ) : null}
        </div>
      </div>
      {hasVisibleTransactions ? (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto pr-3">
            <TransactionsTable transactions={transactions} />
          </div>
          <Pagination
            currentPage={pagination.safePage}
            totalPages={pagination.totalPages}
            onPageChange={handlePageChange}
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
