import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { Pool } from "pg"

const connectionString =
  process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_URL

if (!connectionString) {
  throw new Error(
    "Set DATABASE_DIRECT_URL or DATABASE_URL before running migrations.",
  )
}

const migrationsDirectory = path.join(process.cwd(), "db", "migrations")
const pool = new Pool({ connectionString, max: 1 })

async function main() {
  try {
    const migrationFiles = (await readdir(migrationsDirectory))
      .filter((file) => file.endsWith(".sql"))
      .sort()

    for (const file of migrationFiles) {
      const sql = await readFile(path.join(migrationsDirectory, file), "utf8")
      console.log(`Applying ${file}`)
      await pool.query(sql)
    }

    console.log("Database migrations applied.")
  } finally {
    await pool.end()
  }
}

void main()
