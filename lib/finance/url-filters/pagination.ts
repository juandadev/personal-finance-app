export function getFilteredPagination(
  itemCount: number,
  currentPage: number,
  pageSize = 10,
) {
  const normalizedCount = Math.max(0, itemCount)
  const totalPages = Math.ceil(normalizedCount / pageSize)

  if (totalPages === 0) {
    return {
      totalPages,
      safePage: 1,
      startIndex: 0,
      endIndex: 0,
    }
  }

  const safePage = Math.min(Math.max(1, currentPage), totalPages)

  return {
    totalPages,
    safePage,
    startIndex: (safePage - 1) * pageSize,
    endIndex: safePage * pageSize,
  }
}
