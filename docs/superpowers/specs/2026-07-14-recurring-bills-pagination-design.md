# Recurring Bills Pagination Design

## Goal

Display filtered recurring bills in pages of 10 rows while preserving the
existing responsive desktop table and mobile list.

## Scope

- Add a URL-backed `page` query parameter to Recurring Bills, with a default of
  `1`.
- Filter and sort the complete bill collection before calculating pagination.
- Display at most 10 combined active and archived rows on each page.
- Keep the existing active and archived visual groups. Render a group heading
  only when the current page contains rows for that group.
- Reset to page 1 whenever search, sort, or any recurring-bill filter changes.
- Clamp a stale or out-of-range page to the final valid page when result counts
  shrink.
- Keep the list's internal vertical scroll region and render the shared
  responsive pagination control below it, so page controls stay reachable when
  the table is taller than the viewport.

## Data Flow

`BillsContent` will continue to read URL state through `nuqs` and derive the
filtered, sorted bill list in the client. It will then use the shared
`getFilteredPagination` utility with `ITEMS_PER_PAGE = 10`, slice the
resulting page, and split only that slice into active and archived groups for
rendering.

The `page` value will be included in the recurring-bill query parser and
normalized filter type. This makes a specific page shareable and preserves
browser back/forward navigation.

## UI Behavior

- Desktop uses the existing table and action layout.
- Mobile uses the existing compact bill list rows and overflow actions.
- The existing Transactions pagination component supplies page buttons and
  ellipses on desktop, plus Previous/Next navigation and current-page context
  on mobile.
- The pagination control is not shown when all filtered results fit on one
  page.
- Empty filtered results keep the existing empty state.

## Error and Edge-Case Handling

- Invalid, missing, or non-positive page query values resolve to page 1.
- If URL state requests a page beyond the available range, the rendered slice
  uses the final valid page.
- A zero-result query remains an empty state and does not render pagination.

## Verification

- Add component coverage for 10-row page boundaries, URL page changes,
  search/sort reset behavior, and stale-page clamping.
- Extend URL-filter coverage for Recurring Bills page parsing and normalization.
- Manually verify Recurring Bills with at least 11 records on desktop and
  mobile, including a page containing both active and archived bills.
