import "server-only"

import { createSearchParamsCache } from "nuqs/server"

import { transactionQueryParsers } from "./query-state"

export const transactionSearchParamsCache = createSearchParamsCache(
  transactionQueryParsers,
)
