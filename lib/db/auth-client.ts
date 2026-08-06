import "server-only"

import { attachDatabasePool } from "@vercel/functions"
import { Pool } from "pg"

import { getAuthDatabaseUrl } from "@/lib/env/server"

let authPool: Pool | null = null

export function getAuthDatabasePool() {
  if (authPool) {
    return authPool
  }

  authPool = new Pool({
    connectionString: getAuthDatabaseUrl(),
    max: 3,
  })

  attachDatabasePool(authPool)

  return authPool
}
