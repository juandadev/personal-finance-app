import type { TransactionRecord } from "@/lib/finance/types"

export type TransactionSortFields = {
  postedAt: string
  createdAt: string
  id: string
}

export function compareTransactionsByDateThenCreatedAt(
  left: TransactionSortFields,
  right: TransactionSortFields,
  direction: "asc" | "desc",
): number {
  const postedComparison =
    direction === "desc"
      ? right.postedAt.localeCompare(left.postedAt)
      : left.postedAt.localeCompare(right.postedAt)

  if (postedComparison !== 0) {
    return postedComparison
  }

  const createdComparison =
    direction === "desc"
      ? right.createdAt.localeCompare(left.createdAt)
      : left.createdAt.localeCompare(right.createdAt)

  if (createdComparison !== 0) {
    return createdComparison
  }

  return left.id.localeCompare(right.id)
}

export function compareTransactionRecordsByDateThenCreatedAt(
  left: TransactionRecord,
  right: TransactionRecord,
  direction: "asc" | "desc" = "desc",
): number {
  return compareTransactionsByDateThenCreatedAt(
    {
      postedAt: left.posted_at,
      createdAt: left.created_at,
      id: left.id,
    },
    {
      postedAt: right.posted_at,
      createdAt: right.created_at,
      id: right.id,
    },
    direction,
  )
}

export function compareCreatedAtThenId(
  left: Pick<TransactionSortFields, "createdAt" | "id">,
  right: Pick<TransactionSortFields, "createdAt" | "id">,
  direction: "asc" | "desc" = "desc",
): number {
  const createdComparison =
    direction === "desc"
      ? right.createdAt.localeCompare(left.createdAt)
      : left.createdAt.localeCompare(right.createdAt)

  if (createdComparison !== 0) {
    return createdComparison
  }

  return left.id.localeCompare(right.id)
}
