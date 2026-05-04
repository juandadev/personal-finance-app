"use client"

import CaretRightIcon from "@/components/icons/CaretRightIcon"
import CaretLeftIcon from "@/components/icons/CaretLeftIcon"
import { cn } from "@/lib/utils"

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)

  if (totalPages < 1) return null

  return (
    <div className="flex items-center justify-between pt-6">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="border-muted-foreground/20 text-card-foreground hover:bg-muted flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      >
        <CaretLeftIcon className="size-2" aria-hidden />
        Prev
      </button>

      <div className="flex items-center gap-2">
        {pages.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={cn(
              "flex size-10 items-center justify-center rounded-lg text-sm font-medium transition-colors",
              page === currentPage
                ? "bg-sidebar text-sidebar-primary-foreground"
                : "border-muted-foreground/20 text-card-foreground hover:bg-muted border",
            )}
          >
            {page}
          </button>
        ))}
      </div>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="border-muted-foreground/20 text-card-foreground hover:bg-muted flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      >
        Next
        <CaretRightIcon className="size-2" aria-hidden />
      </button>
    </div>
  )
}
