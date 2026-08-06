import "server-only"

import { attachDatabasePool } from "@vercel/functions"
import { Pool } from "pg"

import { getSchedulerDatabaseUrl } from "@/lib/env/server"

let schedulerPool: Pool | null = null

export function getSchedulerDatabasePool() {
  if (schedulerPool) return schedulerPool

  schedulerPool = new Pool({
    connectionString: getSchedulerDatabaseUrl(),
    max: 2,
  })
  attachDatabasePool(schedulerPool)

  return schedulerPool
}
