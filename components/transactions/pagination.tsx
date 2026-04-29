"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
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

  return (
    <div className="flex items-center justify-between pt-6">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="border-muted-foreground/20 text-card-foreground hover:bg-muted flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ChevronLeft className="size-4" aria-hidden />
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
        <ChevronRight className="size-4" aria-hidden />
      </button>
    </div>
  )
}
