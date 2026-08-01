# Credit Card Zero Statement Lifecycle Implementation Plan

## Goal

Implement the approved zero-statement lifecycle design from
`docs/superpowers/specs/2026-07-08-credit-card-zero-statement-lifecycle-design.md`.

The fix should keep the active card statement visible, let users close
zero-balance statements explicitly, and preserve the rule that paid statements
are locked against direct transaction mutations.

## Constraints

- Do not create payment records or cashflow transactions for zero-dollar
  statement closure.
- Keep `Pay Statement` behavior for positive-balance statements.
- Allow backdated credit-card purchases only while their matching statement is
  unpaid.
- Keep paid statements locked for create, edit, and delete effects.
- Reuse existing finance action result patterns and reducer updates.
- Follow `DESIGN.md` for confirmation dialogs, action labels, inline errors, and
  finance formatting.
- No schema change is required for this iteration.

## Phase 1: Statement Selection Helper

Update statement derivation in `lib/finance/selectors.ts`.

Responsibilities:

- Replace the current overdue-priority selection for a card's displayed
  statement.
- Prefer an unpaid statement whose `periodStart <= today <= periodEnd`.
- If no statement contains today, choose the newest unpaid statement by
  `periodEnd`.
- If all statements are paid, choose the newest paid statement for historical
  display.
- Keep all statements sorted newest first for the detail page.

Expected behavior:

- A stale overdue zero statement no longer replaces the active statement on the
  card tile.
- `totalCreditCardStatementBalance` and the Overview card derive from active
  displayed statements.
- Older unpaid statements remain visible in the detail page list.

## Phase 2: Zero Statement Closure Mutation

Add a server mutation in `lib/finance/queries.ts`.

Suggested function: `closeZeroBalanceCreditCardStatement(userId, statementId)`.

Responsibilities:

- Select the statement with `FOR UPDATE`.
- Reject missing statements.
- Reject statements where `lifecycle_status = 'paid'`.
- Reject statements where `statement_amount_cents > 0`.
- Update the statement to `lifecycle_status = 'paid'` and `paid_at = now()`.
- Return the updated statement record.

Add a matching server action in `lib/finance/actions.ts`.

Responsibilities:

- Validate `statementId` as a UUID.
- Call the query helper.
- Return `{ ok: true, message: "Statement closed.", data }` on success.
- Return existing inline-action error shapes on failure.

## Phase 3: Client State Wiring

Update `lib/finance/reducer.ts` and `components/providers/finance-provider.tsx`.

Responsibilities:

- Add a finance action method such as `closeCreditCardStatement(statementId)`.
- Dispatch a statement upsert with the returned updated statement.
- Keep the existing payment reducer action unchanged for real payments.
- Ensure closing a zero statement updates card tiles and detail pages without a
  full reload.

Expected behavior:

- The old zero statement immediately shows as paid/locked.
- The active statement remains selected after closure.

## Phase 4: Close Statement UI

Add an explicit close action for zero-balance unpaid statements in
`components/credit-cards`.

Recommended implementation:

- Create a small `CloseCreditCardStatementDialog` component, or generalize the
  existing payment dialog only if the result stays clear.
- Use `AlertDialog` with finance styling.
- Show card nickname, statement period, due date, and `$0.00` amount.
- Explain that closing the statement locks the cycle and records no payment.
- Primary action label: `Close Statement`.
- Pending label: `Closing...`.
- Cancel label: `Cancel`.
- Keep the dialog open and show inline status on failure.

Render rules:

- In the statement list, show `Close Statement` for unpaid statements with amount
  equal to zero.
- Keep `Pay Statement` for unpaid statements with amount greater than zero.
- On the card tile, show the close action only if the displayed current statement
  is unpaid and zero-balance.
- Paid statements keep the lock indicator and no payment/closure action.

## Phase 5: Paid Statement Guard Review

Review the transaction mutation path in `lib/finance/queries.ts`.

Responsibilities:

- Confirm `ensureOpenCreditCardStatement()` blocks paid target statements.
- Confirm reversing an existing credit-card transaction blocks paid source
  statements.
- Confirm delete uses the same paid-statement guard through statement effect
  reversal.
- Tighten naming or errors only if needed for clarity.

Expected behavior:

- Backdated purchases into unpaid statements remain allowed.
- Mutations touching paid statements fail with user-actionable copy.

## Phase 6: Data Repair

After the UI and mutation exist, repair the current Joy Banamex stale statement
through the new action.

Expected outcome:

- The `2026-05-21` to `2026-06-20` zero-balance statement becomes paid/locked.
- The `2026-06-21` to `2026-07-20` active statement remains open with its
  current transaction balance.
- No payment history row or payment transaction is created for the zero closure.

If the app state cannot trigger the action easily during development, perform
the same mutation through a controlled SQL update after confirming the statement
still has `statement_amount_cents = 0`.

## Phase 7: Verification

Run formatting after implementation.

Run available project checks:

- `bun run format`
- `bun run lint`

Manual verification checklist:

- Open Credit Cards and confirm Joy Banamex shows the active statement balance
  rather than the old `$0` overdue statement.
- Open Joy Banamex details and confirm both the active statement and the old zero
  statement are visible.
- Close the old zero statement and confirm it becomes paid/locked.
- Confirm no payment record is added for the zero statement closure.
- Confirm Overview credit-card totals use the active statement balance.
- Add a backdated credit-card purchase into an unpaid statement and confirm it is
  accepted.
- Try adding or moving a purchase into the closed zero statement and confirm it
  is blocked.

## Implementation Order

1. Update statement selection in selectors.
2. Add the zero-statement close query and server action.
3. Wire the provider/reducer client action.
4. Add the close statement dialog and render it in card/detail UI.
5. Review paid-statement guards in transaction mutations.
6. Run formatting and linting.
7. Manually verify the Joy Banamex scenario.
8. Repair the existing zero statement using the new action or a controlled SQL
   fallback.
