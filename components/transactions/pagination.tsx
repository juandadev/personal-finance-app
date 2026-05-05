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
        variant="outline"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        <CaretLeftIcon className="size-2" aria-hidden />
        Prev
      </Button>

      <div className="flex items-center gap-2">
        {pages.map((page) => (
          <Button
            variant="outline"
            key={page}
            onClick={() => onPageChange(page)}
            className={cn(
              page === currentPage
                ? "bg-sidebar text-sidebar-primary-foreground"
                : "border-muted-foreground/20 text-card-foreground hover:bg-muted border",
            )}
          >
            {page}
          </Button>
        ))}
      </div>

      <Button
        variant="outline"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        Next
        <CaretRightIcon className="size-2" aria-hidden />
      </Button>
    </div>
  )
}
