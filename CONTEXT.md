# Personal Finance

This context describes the shared language for managing personal financial information and participation in the closed beta.

## Language

**Financial Record**:
A user-owned representation of a monetary event, obligation, balance, plan, or allocation.
_Avoid_: Transaction, entry

**Closed Beta User**:
A person in Mexico who has been invited and accepted to evaluate the service before general availability.
_Avoid_: Customer, public user

**Invitation**:
A limited grant of eligibility to join the closed beta.
_Avoid_: Account, registration

**Verified Identity**:
An identity whose claimed contact channel has been proven to be under the claimant's control.
_Avoid_: Authenticated session, approved user

**Operator**:
A trusted person authorized to administer or support the service on its owner's behalf.
_Avoid_: End user, administrator account

**Scheduled Monthly Close**:
A planned monthly boundary at which eligible Financial Records are finalized for a defined period.
_Avoid_: Monthly reset, month rollover

**Data Export**:
A portable copy of a Closed Beta User's information provided for their own use.
_Avoid_: Backup, report

**Account Deletion**:
A Closed Beta User's request to end their participation and remove information associated with their account.
_Avoid_: Deactivation, sign-out

**Recovery Window**:
The limited period during which an earlier state of the service may still be restored after data loss or corruption.
_Avoid_: Retention period, deletion grace period

**Production Data**:
Information created, submitted, or derived through use of the live service.
_Avoid_: Test data, sample data

**Recurring Bill**:
A repeating obligation with a due schedule, optional credit-card assignment, and a lifecycle of Active, Paused, or Archived.
_Avoid_: Subscription (as a persistence term), standing order

**Scheduled End**:
A pending Cancel or Pause date on a still-Active card-assigned Recurring Bill; the bill remains Active until that date, then becomes Archived or Paused.
_Avoid_: Soft delete, delayed archive, cancel immediately

**Cancel (Recurring Bill)**:
The product action that ends a Recurring Bill permanently (persisted as archive), keeping history; for card-assigned bills this uses a Scheduled End on the next due date after today.
_Avoid_: Delete, remove charge, keep/remove prompt
