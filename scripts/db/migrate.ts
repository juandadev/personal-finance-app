import { createHash } from "node:crypto"
import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { Pool, type PoolClient } from "pg"

const MIGRATION_FILE_PATTERN = /^(\d{3})_[a-z0-9][a-z0-9_]*\.sql$/
const MIGRATION_LOCK_KEYS: [number, number] = [1885682737, 1835623026]
const LATEST_LEGACY_MIGRATION = "021_credit_card_annuality.sql"

export interface Migration {
  name: string
  checksum: string
  sql: string
}

export interface AppliedMigration {
  name: string
  checksum: string
}

interface MigrationOptions {
  baselineThrough?: string
}

export function checksumMigration(sql: string) {
  return createHash("sha256").update(sql, "utf8").digest("hex")
}

export function sortMigrationNames(files: string[]) {
  const migrationFiles = files.filter((file) => file.endsWith(".sql")).sort()
  const seenSequences = new Map<string, string>()

  for (const file of migrationFiles) {
    const match = MIGRATION_FILE_PATTERN.exec(file)

    if (!match) {
      throw new Error(
        `Invalid migration filename "${file}". Expected NNN_lowercase_name.sql.`,
      )
    }

    const existingFile = seenSequences.get(match[1])

    if (existingFile) {
      throw new Error(
        `Migration sequence ${match[1]} is used by both ${existingFile} and ${file}.`,
      )
    }

    seenSequences.set(match[1], file)
  }

  return migrationFiles
}

export function getPendingMigrations(
  migrations: Migration[],
  appliedMigrations: AppliedMigration[],
) {
  const availableByName = new Map(
    migrations.map((migration) => [migration.name, migration]),
  )
  const appliedNames = new Set<string>()

  for (const applied of appliedMigrations) {
    const migration = availableByName.get(applied.name)

    if (!migration) {
      throw new Error(
        `Applied migration ${applied.name} is missing from db/migrations.`,
      )
    }

    if (migration.checksum !== applied.checksum) {
      throw new Error(
        `Checksum mismatch for ${applied.name}: database=${applied.checksum} file=${migration.checksum}. ` +
          "Applied migrations must never be edited.",
      )
    }

    appliedNames.add(applied.name)
  }

  return migrations.filter((migration) => !appliedNames.has(migration.name))
}

export function parseMigrationOptions(args: string[]): MigrationOptions {
  let baselineThrough: string | undefined

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]

    if (argument === "--baseline-through") {
      baselineThrough = args[index + 1]
      index += 1
    } else if (argument.startsWith("--baseline-through=")) {
      baselineThrough = argument.slice("--baseline-through=".length)
    } else {
      throw new Error(`Unknown migration option: ${argument}`)
    }

    if (!baselineThrough) {
      throw new Error("--baseline-through requires a migration filename.")
    }
  }

  return { baselineThrough }
}

async function loadMigrations(directory: string): Promise<Migration[]> {
  const files = sortMigrationNames(await readdir(directory))

  return Promise.all(
    files.map(async (name) => {
      const sql = await readFile(path.join(directory, name), "utf8")

      return { name, sql, checksum: checksumMigration(sql) }
    }),
  )
}

async function ensureMigrationsTable(client: PoolClient) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      name text PRIMARY KEY,
      checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now(),
      execution_time_ms integer NOT NULL,
      is_baseline boolean NOT NULL DEFAULT false,
      CONSTRAINT schema_migrations_checksum_check
        CHECK (checksum ~ '^[0-9a-f]{64}$'),
      CONSTRAINT schema_migrations_execution_time_check
        CHECK (execution_time_ms >= 0)
    )
  `)
}

async function readAppliedMigrations(
  client: PoolClient,
): Promise<AppliedMigration[]> {
  const result = await client.query<AppliedMigration>(`
    SELECT name, checksum
    FROM public.schema_migrations
    ORDER BY name
  `)

  return result.rows
}

async function hasLegacySchema(client: PoolClient) {
  const result = await client.query<{ exists: boolean }>(`
    SELECT to_regclass('public.profiles') IS NOT NULL AS exists
  `)

  return result.rows[0]?.exists ?? false
}

async function hasCompleteLegacyBaseline(client: PoolClient) {
  const result = await client.query<{ complete: boolean }>(`
    SELECT
      to_regclass('public.profiles') IS NOT NULL
      AND to_regclass('public.credit_cards') IS NOT NULL
      AND to_regclass('public.credit_card_annuality_overrides') IS NOT NULL
      AND (
        SELECT count(*) = 5
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'credit_cards'
          AND column_name IN (
            'annuality_enabled',
            'annuality_amount_cents',
            'annuality_anniversary_month',
            'annuality_anniversary_day',
            'annuality_payment_count'
          )
      )
      AND EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'credit_cards_annuality_check'
          AND conrelid = to_regclass('public.credit_cards')
      ) AS complete
  `)

  return result.rows[0]?.complete ?? false
}

async function baselineMigrations(
  client: PoolClient,
  migrations: Migration[],
  baselineThrough: string,
) {
  if (baselineThrough !== LATEST_LEGACY_MIGRATION) {
    throw new Error(
      `Legacy baselines must end at ${LATEST_LEGACY_MIGRATION}; received ${baselineThrough}.`,
    )
  }

  const targetIndex = migrations.findIndex(
    (migration) => migration.name === baselineThrough,
  )

  if (targetIndex === -1) {
    throw new Error(
      `Cannot baseline through unknown migration ${baselineThrough}.`,
    )
  }

  const appliedMigrations = await readAppliedMigrations(client)

  if (appliedMigrations.length > 0) {
    throw new Error(
      "Baseline is only allowed when schema_migrations has no records.",
    )
  }

  if (!(await hasCompleteLegacyBaseline(client))) {
    throw new Error(
      `Baseline refused because the database does not contain all expected ${LATEST_LEGACY_MIGRATION} artifacts.`,
    )
  }

  await client.query("BEGIN")

  try {
    for (const migration of migrations.slice(0, targetIndex + 1)) {
      await client.query(
        `
          INSERT INTO public.schema_migrations (
            name,
            checksum,
            execution_time_ms,
            is_baseline
          )
          VALUES ($1, $2, 0, true)
        `,
        [migration.name, migration.checksum],
      )
    }

    await client.query("COMMIT")
    console.log(`Baselined migrations through ${baselineThrough}.`)
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  }
}

async function applyMigration(client: PoolClient, migration: Migration) {
  const startedAt = Date.now()

  await client.query("BEGIN")

  try {
    await client.query(migration.sql)
    await client.query(
      `
        INSERT INTO public.schema_migrations (
          name,
          checksum,
          execution_time_ms
        )
        VALUES ($1, $2, $3)
      `,
      [migration.name, migration.checksum, Date.now() - startedAt],
    )
    await client.query("COMMIT")
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  }
}

async function main() {
  const connectionString = process.env.DATABASE_DIRECT_URL

  if (!connectionString) {
    throw new Error("Set DATABASE_DIRECT_URL before running migrations.")
  }

  const migrationsDirectory = path.join(process.cwd(), "db", "migrations")
  const migrations = await loadMigrations(migrationsDirectory)
  const options = parseMigrationOptions(process.argv.slice(2))
  const pool = new Pool({ connectionString, max: 1 })
  const client = await pool.connect()

  try {
    await client.query("SELECT pg_advisory_lock($1, $2)", MIGRATION_LOCK_KEYS)
    await ensureMigrationsTable(client)

    let appliedMigrations = await readAppliedMigrations(client)

    if (options.baselineThrough) {
      await baselineMigrations(client, migrations, options.baselineThrough)
      appliedMigrations = await readAppliedMigrations(client)
    } else if (
      appliedMigrations.length === 0 &&
      (await hasLegacySchema(client))
    ) {
      throw new Error(
        "This database has a legacy schema but no migration history. " +
          `Verify it is current, then run with --baseline-through=${LATEST_LEGACY_MIGRATION}.`,
      )
    }

    const pendingMigrations = getPendingMigrations(
      migrations,
      appliedMigrations,
    )

    for (const migration of pendingMigrations) {
      console.log(`Applying ${migration.name}`)
      await applyMigration(client, migration)
    }

    console.log(
      pendingMigrations.length === 0
        ? "Database is already current."
        : "Database migrations applied.",
    )
  } finally {
    await client
      .query("SELECT pg_advisory_unlock($1, $2)", MIGRATION_LOCK_KEYS)
      .catch(() => undefined)
    client.release()
    await pool.end()
  }
}

if (import.meta.main) {
  void main().catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
}
