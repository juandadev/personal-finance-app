import "server-only"

import { attachDatabasePool } from "@vercel/functions"
import { Pool } from "pg"

let pool: Pool | null = null

export function getDatabasePool() {
  if (pool) {
    return pool
  }

  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error("DATABASE_URL is required for finance database access.")
  }

  pool = new Pool({
    connectionString,
    max: 5,
  })

  attachDatabasePool(pool)

  return pool
}
