# Pot Movements Design

## Goal

Extend the existing **Add Money** and **Withdraw** pot actions so a user can
adjust a pot directly, move money through the primary bank account while
recording a transaction, or transfer money between pots.

## Scope

This work adds movement behavior to existing pot dialogs. It does not add a
pot-movement history screen or a general account-management interface.

## Movement Modes

Each action operates atomically and supports one of these modes:

| Action    | Mode              | Effect                                                                          |
| --------- | ----------------- | ------------------------------------------------------------------------------- |
| Add Money | Direct Adjustment | Increases only the selected pot balance.                                        |
| Withdraw  | Direct Adjustment | Decreases only the selected pot balance.                                        |
| Add Money | Main Account      | Increases the pot and records a matching expense from the primary bank account. |
| Withdraw  | Main Account      | Decreases the pot and records a matching income to the primary bank account.    |
| Add Money | Another Pot       | Decreases the selected source pot and increases the current pot.                |
| Withdraw  | Another Pot       | Decreases the current pot and increases the selected destination pot.           |

Internal pot-to-pot transfers never create bank-account transactions or budget
assignments.

## Data Model

### Primary Account

Add a durable per-user primary-account marker. Database constraints ensure that
at most one eligible cash account is primary for each user. Existing users'
current main account is backfilled as primary.

Pot-movement requests refer to an account source/destination abstractly. The
initial UI exposes only the primary account, but the action accepts an account
identifier so future multiple-account support can offer a selector without
redesigning the write path.

### Owner Contact

Add a durable owner-contact marker for counterparties. Backfill one
`Juan Martinez` person contact per user and mark it as the account owner. This
contact is used automatically for bank-account pot movements rather than
matching a display name at runtime.

### Defaults

The server resolves a missing category to the user's `General` category.
Missing concepts resolve to:

- `Deposit to {pot name}` for Add Money
- `Taken from {pot name}` for Withdraw

The current profile-local date is the default transaction date; future dates
are rejected. Pot-movement transactions never receive a budget assignment.

## Server Action and Consistency

Replace the isolated deposit/withdraw action with a validated pot-movement
action. Its request contains the acting pot, positive amount, direction,
source/destination mode, optional secondary-pot or account id, and
transaction-only fields when an account is involved.

Within one database transaction, the action:

1. Validates user ownership and the movement shape.
2. Rejects self-transfers and insufficient source-pot balances.
3. Resolves the primary account, owner contact, General fallback category, and
   concept defaults when applicable.
4. Updates the affected pot or pots.
5. For a main-account movement, inserts the signed transaction and applies the
   existing account balance and monthly-summary effects.
6. Returns every changed pot, transaction, account, and account summary for a
   single reducer update.

This prevents a partial update where a pot changes but its corresponding
transaction or account balance does not.

## Dialog UX

The current dialogs retain the amount input and live pot-progress preview.
They add an optional source/destination field:

- **Add Money:** Direct Adjustment (default), Main Account, or Transfer From
  another pot.
- **Withdraw:** Direct Adjustment (default), Main Account, or Transfer To
  another pot.

Selecting Main Account reveals optional Concept and Category fields plus the
transaction date. Selecting another pot presents eligible pots other than the
current pot and hides transaction fields. Direct Adjustment preserves the
compact existing flow.

Submit labels remain action-specific. Inline errors explain insufficient funds,
no available primary account, missing owner or General setup data, invalid
future dates, and invalid transfer destinations.

## Tests

Cover:

- direct add and withdraw behavior;
- account-backed Add Money expense and Withdraw income transaction signs;
- account and monthly-summary changes;
- default and custom concepts;
- General-category fallback and owner-contact use;
- atomic internal transfers in both directions;
- blocked self-transfers and insufficient balances;
- rejection of invalid ownership, account, category, and future-date inputs;
- absence of budget assignments for every pot movement;
- primary-account resolution and required setup errors.
