import "server-only"

import type { PoolClient } from "pg"

import { getDatabasePool } from "@/lib/db/client"

export async function withFinanceTransaction<T>(
  userId: string,
  callback: (client: PoolClient) => Promise<T>,
) {
  const client = await getDatabasePool().connect()

  try {
    await client.query("BEGIN")
    await client.query("SELECT set_config('app.current_user_id', $1, true)", [
      userId,
    ])
    const result = await callback(client)
    await client.query("COMMIT")
    return result
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
}
