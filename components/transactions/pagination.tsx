"use client"

import CaretRightIcon from "@/components/icons/CaretRightIcon"
import CaretLeftIcon from "@/components/icons/CaretLeftIcon"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

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
      <Button
        size="sm"
        variant="outline"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        <CaretLeftIcon aria-hidden />
        Prev
      </Button>

      <div className="flex items-center gap-2">
        {pages.map((page) => (
          <Button
            variant="outline"
            size="sm"
            key={page}
            onClick={() => onPageChange(page)}
            className={cn(
              page === currentPage
                ? "bg-sidebar text-sidebar-primary-foreground"
                : "text-card-foreground",
            )}
          >
            {page}
          </Button>
        ))}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        Next
        <CaretRightIcon aria-hidden />
      </Button>
    </div>
  )
}
