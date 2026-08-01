# Transaction Sort by Date then Creation Time — Design

**Date:** 2026-07-27  
**Status:** Awaiting spec review

## Summary

Transaction lists currently order only by `posted_at`. When several transactions
share the same day, older rows stay above newer ones. Sort every user-facing
transaction list by posted date first, then by creation time so the most recently
created same-day transaction appears first under Latest.

## Goals

- Order transactions by `posted_at`, then by `created_at`, then by `id ASC`.
- Apply the same rule app-wide: Transactions page, overview recent list, budget
  latest slices, and any other list that uses the shared transaction array or
  `sortTransactions`.
- Keep Latest / Oldest directions consistent:
  - Latest: `posted_at DESC`, `created_at DESC`, `id ASC`
  - Oldest: `posted_at ASC`, `created_at ASC`, `id ASC`
- For non-date sorts (A–Z, Z–A, highest, lowest), keep the existing primary key
  and use `created_at DESC`, then `id ASC`, only as a silent tiebreaker.
- Load `created_at` from the database into domain and UI transaction models so
  client sorts can use it after mutations and filter changes.

## Non-Goals

- New sort UI options or labels.
- Changing forecast, credit-card obligation, or other internal calculation sorts
  that are not user-facing transaction lists.
- Database schema changes (`created_at` already exists on `transactions`).
- Changing how `posted_at` is chosen or edited.

## Current Behavior

- DB load uses `ORDER BY posted_at DESC, id`.
- `sortTransactions("latest" | "oldest")` compares only `postedAt`.
- Reducer re-sorts after several mutations with only `posted_at`.
- `TransactionRecord` and UI `Transaction` do not include `created_at`.
- Overview and budget cards slice the already-ordered transaction array, so they
  inherit the canonical order.

Because equal `posted_at` values have no creation tiebreaker, newly created
same-day transactions tend to stay below earlier ones.

## Sort Rule

Shared comparator (conceptual):

1. Compare primary field for the active sort mode.
2. If equal, compare `created_at` in the direction of that mode (DESC for Latest
   and non-date sorts; ASC for Oldest).
3. If still equal, compare `id` for a deterministic final order.

Date modes:

| Mode   | Primary          | Secondary         | Tertiary |
| ------ | ---------------- | ----------------- | -------- |
| Latest | `posted_at` DESC | `created_at` DESC | `id ASC` |
| Oldest | `posted_at` ASC  | `created_at` ASC  | `id ASC` |

Non-date modes keep today’s primary comparison (name or amount), then
`created_at DESC`, then `id ASC`.

## Architecture

### Data model

- Add `created_at: string` to `TransactionRecord`.
- Add `createdAt: string` to UI `Transaction`.
- Include `created_at::text AS created_at` in transaction select columns so load,
  insert, and update returning rows all carry it.
- Widen `NewTransactionRecord` to omit `created_at` (and `updated_at` if added)
  so callers do not invent creation timestamps; inserts rely on the DB default
  and read `created_at` back from `RETURNING`.

### Canonical ordering

1. **Initial load** — `ORDER BY posted_at DESC, created_at DESC, id ASC`.
2. **Shared helper** — e.g. `compareTransactionsByPostedAtThenCreatedAt(direction)`
   used by the finance reducer whenever it re-sorts `state.transactions`.
3. **URL filter sort** — `sortTransactions` uses `createdAt` as the secondary
   (and tertiary `id ASC`) key for all modes as defined above.
4. **Derived lists** — overview recent, budget latest, and similar slices keep
   using the sorted array; no per-component sort logic.

### Mutation paths

Any reducer path that currently sorts by `posted_at` alone switches to the
shared helper. Paths that only append without sorting should either sort with
the same helper or leave order intact only when a later shared sort is
guaranteed before display; prefer sorting at the mutation boundary so state
order stays canonical.

## Testing

- Unit tests for `sortTransactions`:
  - Same `postedAt`, different `createdAt` → Latest puts newer creation first;
    Oldest puts older creation first.
  - Different `postedAt` still wins over `createdAt`.
- Reducer / selector coverage only where existing tests already assert
  transaction order; update fixtures to include `created_at` / `createdAt`.
- No UI screenshot or e2e requirement for this change.

## Acceptance Criteria

1. Creating several transactions on the same `posted_at` shows the newest
   creation at the top under Latest (and in overview/budget latest slices).
2. Reloading the app preserves that order.
3. Oldest inverts both date and creation order.
4. A–Z / amount sorts are unchanged for distinct keys; ties fall back to newer
   creation first.
