import "server-only"

import { attachDatabasePool } from "@vercel/functions"
import { Pool } from "pg"

import { getDatabaseUrl } from "@/lib/env/server"

let pool: Pool | null = null

export function getDatabasePool() {
  if (pool) {
    return pool
  }

  pool = new Pool({
    connectionString: getDatabaseUrl(),
    max: 5,
  })

  attachDatabasePool(pool)

  return pool
}
