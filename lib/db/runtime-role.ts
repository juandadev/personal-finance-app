import "server-only"

import type { PoolClient } from "pg"

import {
  isPrivilegedRuntimeRole,
  type RuntimeRole,
} from "@/lib/db/runtime-role-policy"

let verified = false
let warningEmitted = false

export async function assertSafeRuntimeRole(client: PoolClient) {
  if (verified) return

  const result = await client.query<RuntimeRole>(
    `
      SELECT
        rolname,
        rolsuper,
        rolcreaterole,
        rolcreatedb,
        rolbypassrls
      FROM pg_roles
      WHERE rolname = current_user
    `,
  )
  const role = result.rows[0]

  if (!role) {
    throw new Error("Unable to verify the database runtime role.")
  }

  if (isPrivilegedRuntimeRole(role)) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Production DATABASE_URL must use a least-privilege, non-BYPASSRLS role.",
      )
    }

    if (!warningEmitted) {
      warningEmitted = true
      console.warn(
        "Development DATABASE_URL uses a privileged role. RLS isolation is not being exercised.",
      )
    }

    return
  }

  verified = true
}
