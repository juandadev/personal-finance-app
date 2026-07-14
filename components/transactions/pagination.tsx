"use client"

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react"

import {
  Pagination as PaginationRoot,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { useIsMobile } from "@/hooks/use-mobile"

const MIN_VISIBLE_PAGE_ITEMS = 5
const PAGE_ITEM_GAP_WIDTH = 8
const CONTROL_GAP_WIDTH = 16

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

type PaginationItemValue = number | "start-ellipsis" | "end-ellipsis"

function getPaginationItemWidth(totalPages: number) {
  const digitWidth = String(totalPages).length * 8

  return Math.max(40, digitWidth + 32)
}

function getPaginationItems(
  currentPage: number,
  totalPages: number,
  maxVisibleItems: number,
): PaginationItemValue[] {
  const visibleItems = Math.max(MIN_VISIBLE_PAGE_ITEMS, maxVisibleItems)

  if (totalPages <= visibleItems) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const startRangeEnd = visibleItems - 2
  const endRangeStart = totalPages - visibleItems + 3

  if (currentPage <= startRangeEnd) {
    return [
      ...Array.from({ length: startRangeEnd }, (_, index) => index + 1),
      "end-ellipsis",
      totalPages,
    ]
  }

  if (currentPage >= endRangeStart) {
    return [
      1,
      "start-ellipsis",
      ...Array.from(
        { length: totalPages - endRangeStart + 1 },
        (_, index) => endRangeStart + index,
      ),
    ]
  }

  const middleCount = visibleItems - 4
  const middleStart = currentPage - Math.floor((middleCount - 1) / 2)

  return [
    1,
    "start-ellipsis",
    ...Array.from({ length: middleCount }, (_, index) => middleStart + index),
    "end-ellipsis",
    totalPages,
  ]
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  const isMobile = useIsMobile()
  const paginationRef = useRef<HTMLElement>(null)
  const previousRef = useRef<HTMLAnchorElement>(null)
  const nextRef = useRef<HTMLAnchorElement>(null)
  const [maxVisibleItems, setMaxVisibleItems] = useState(MIN_VISIBLE_PAGE_ITEMS)

  useEffect(() => {
    if (isMobile) return

    const pagination = paginationRef.current

    if (!pagination) return

    const updateVisibleItems = () => {
      const containerWidth = pagination.clientWidth
      const previousWidth = previousRef.current?.offsetWidth ?? 0
      const nextWidth = nextRef.current?.offsetWidth ?? 0
      const availableWidth = Math.max(
        0,
        containerWidth - previousWidth - nextWidth - CONTROL_GAP_WIDTH,
      )
      const pageItemWidth = getPaginationItemWidth(totalPages)
      const visibleItems = Math.floor(
        (availableWidth + PAGE_ITEM_GAP_WIDTH) /
          (pageItemWidth + PAGE_ITEM_GAP_WIDTH),
      )

      setMaxVisibleItems(Math.max(MIN_VISIBLE_PAGE_ITEMS, visibleItems))
    }

    updateVisibleItems()

    const resizeObserver = new ResizeObserver(updateVisibleItems)
    resizeObserver.observe(pagination)

    if (previousRef.current) resizeObserver.observe(previousRef.current)
    if (nextRef.current) resizeObserver.observe(nextRef.current)

    return () => resizeObserver.disconnect()
  }, [isMobile, totalPages])

  const paginationItems = useMemo(
    () => getPaginationItems(currentPage, totalPages, maxVisibleItems),
    [currentPage, maxVisibleItems, totalPages],
  )

  if (totalPages < 1) return null

  const handlePageChange =
    (page: number) => (event: MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault()

      if (page < 1 || page > totalPages || page === currentPage) return

      onPageChange(page)
    }

  return (
    <PaginationRoot ref={paginationRef}>
      <PaginationPrevious
        ref={previousRef}
        href="#"
        aria-disabled={currentPage === 1}
        onClick={handlePageChange(currentPage - 1)}
      />

      {isMobile ? (
        <p
          className="text-muted-foreground shrink-0 text-sm tabular-nums"
          aria-live="polite"
        >
          <span className="sr-only">Page </span>
          <span className="text-foreground font-semibold">{currentPage}</span>
          <span aria-hidden> / </span>
          {totalPages}
        </p>
      ) : (
        <PaginationContent>
          {paginationItems.map((item) => (
            <PaginationItem key={item}>
              {typeof item === "number" ? (
                <PaginationLink
                  href="#"
                  size="sm"
                  isActive={item === currentPage}
                  aria-label={
                    item === currentPage ? `Page ${item}` : `Go to page ${item}`
                  }
                  onClick={handlePageChange(item)}
                >
                  {item}
                </PaginationLink>
              ) : (
                <PaginationEllipsis />
              )}
            </PaginationItem>
          ))}
        </PaginationContent>
      )}

      <PaginationNext
        ref={nextRef}
        href="#"
        aria-disabled={currentPage === totalPages}
        onClick={handlePageChange(currentPage + 1)}
      />
    </PaginationRoot>
  )
}
