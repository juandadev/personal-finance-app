import { describe, expect, test } from "bun:test"

import {
  checksumMigration,
  getPendingMigrations,
  parseMigrationOptions,
  sortMigrationNames,
  type Migration,
} from "./migrate"

function migration(name: string, sql: string): Migration {
  return { name, sql, checksum: checksumMigration(sql) }
}

describe("database migration bookkeeping", () => {
  test("sorts migrations deterministically and ignores non-SQL files", () => {
    expect(
      sortMigrationNames([
        "README.md",
        "010_tenth.sql",
        "002_second.sql",
        "001_first.sql",
      ]),
    ).toEqual(["001_first.sql", "002_second.sql", "010_tenth.sql"])
  })

  test("rejects duplicate migration sequence numbers", () => {
    expect(() =>
      sortMigrationNames(["022_security.sql", "022_other.sql"]),
    ).toThrow("Migration sequence 022")
  })

  test("returns only migrations not recorded in the database", () => {
    const migrations = [
      migration("001_first.sql", "SELECT 1;"),
      migration("002_second.sql", "SELECT 2;"),
    ]

    expect(
      getPendingMigrations(migrations, [
        {
          name: migrations[0].name,
          checksum: migrations[0].checksum,
        },
      ]),
    ).toEqual([migrations[1]])
  })

  test("fails when an applied migration checksum changes", () => {
    const migrations = [migration("001_first.sql", "SELECT 1;")]

    expect(() =>
      getPendingMigrations(migrations, [
        { name: "001_first.sql", checksum: checksumMigration("SELECT 2;") },
      ]),
    ).toThrow("Checksum mismatch for 001_first.sql")
  })

  test("fails when an applied migration file is missing", () => {
    expect(() =>
      getPendingMigrations(
        [],
        [{ name: "001_missing.sql", checksum: checksumMigration("SELECT 1;") }],
      ),
    ).toThrow("missing from db/migrations")
  })

  test("parses explicit baseline options", () => {
    expect(
      parseMigrationOptions([
        "--baseline-through=021_credit_card_annuality.sql",
      ]),
    ).toEqual({ baselineThrough: "021_credit_card_annuality.sql" })
    expect(
      parseMigrationOptions([
        "--baseline-through",
        "021_credit_card_annuality.sql",
      ]),
    ).toEqual({ baselineThrough: "021_credit_card_annuality.sql" })
  })
})
