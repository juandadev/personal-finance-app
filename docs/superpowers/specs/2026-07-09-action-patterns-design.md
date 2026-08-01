# Action-Pattern Standardization Design

## Goal

Standardize module-header and item-level actions so the product remains calm,
scannable, and responsive across all finance modules. The standard reduces
visual noise by reserving visible actions for high-frequency task completion
and placing secondary record-management actions in overflow menus.

## Design Rules

### Module Headers

- Every actionable module header uses a left-aligned title and a right-aligned
  action area in a `justify-between` layout.
- A module may show one visible primary action.
- If it has secondary actions, it shows a single icon-only ellipsis trigger
  beside the primary action. Secondary actions appear in its menu.
- Header actions must remain usable without title/action overflow on mobile.
- A navigation action such as `See Details` or `View All` is valid as the
  single header action for read-only dashboard widgets.

### Cards and List Rows

- Managed cards and list/table rows may show at most two dedicated action
  buttons.
- Visible actions are reserved for high-frequency or important task-completion
  flows, such as adding or withdrawing money, paying a bill, skipping a bill,
  viewing card details, or settling a credit-card statement.
- Record-management and lower-frequency actions, including Edit, Delete, and
  Archive, appear in an item-level ellipsis menu by default.
- Selectors, toggles, and inline data-entry controls are not action buttons
  for this limit.
- Empty-state calls to action are exempt because they provide onboarding, not
  per-record management.

### Overflow Variants

There are two distinct overflow variants:

1. **Header overflow** lives in the right-side module action area and exposes
   secondary module-level actions.
2. **Item overflow** is an icon-only ellipsis button in the top-right of a
   managed card or at the action end of a list/table row. It exposes actions
   for that specific record.

Both variants use the existing shadcn dropdown menu and existing design
tokens. Icon-only triggers have an accessible name, a visible focus state, and
tooltips when grouped with nearby controls. Menu labels use Title Case;
destructive actions use destructive menu styling.

## Reusable Component Boundaries

### ModuleHeaderActions

This component owns the header action arrangement:

- one visible primary action;
- an optional ellipsis dropdown for secondary actions;
- responsive spacing that preserves the `justify-between` header alignment.

It composes with `PageHeading`, `CardHeader`, and `CardAction`; it does not
perform business operations or decide whether an action is primary.

### ItemActions

This component owns item-specific overflow:

- icon-only ellipsis trigger;
- contextual menu action rendering;
- destructive action styling;
- accessible label, keyboard behavior, and focus restoration.

The consuming card or row retains up to two independently rendered,
high-frequency actions and passes only secondary actions to this component.

## Migration Scope

### Header Changes

- **Transactions:** keep `Add Transaction` visible and move `Manage Library`
  into header overflow.
- **Recurring Bills:** move `Add Bill` from the content toolbar to
  `PageHeading`.
- **Credit Cards:** move `Add Credit Card` from the content grid area to
  `PageHeading`.

### Item Changes

- **Credit-card tiles:** retain `See Details` and conditional `Pay Statement`
  or `Close Statement` as the two visible actions. Move `Edit` and `Archive`
  to item overflow.
- **Recurring-bill rows:** retain `Pay Bill` and `Skip` when valid; move
  `Edit` and `Archive` into item overflow. Rows omit actions that are invalid
  for their current state.
- **Transaction-library category and contact rows:** move `Edit` and `Delete`
  into item overflow.
- **Transaction table rows:** keep budget assignment inline as a data control
  and move the dedicated Edit action into item overflow.

### Existing Reference Patterns

Pots and Budgets already represent the intended prioritization:

- Pots retain `Add Money` and `Withdraw` as visible task actions, with Edit
  and Delete in overflow.
- Budget cards retain Edit and Delete in overflow because neither is a
  high-frequency card action.

They may adopt the shared component internally only when that preserves their
existing behavior.

### Exempt Surfaces

Dashboard widget links (`See Details`, `View All`), read-only content
sections, and empty-state calls to action are not part of this migration.

## Behavior and Error Handling

The refactor only changes action placement. Existing dialogs, confirmations,
routes, permissions, validation, and server-action feedback remain the source
of truth.

- Omit unavailable actions instead of rendering disabled menu entries.
- Keep destructive confirmation dialogs and explicit destructive labels.
- Return focus to the ellipsis trigger after its menu closes.
- Preserve keyboard menu navigation and visible focus treatment.

## Verification

- Add component coverage for primary versus overflow action composition and
  destructive menu presentation.
- Test responsive header layout with long titles and action menus at mobile
  widths.
- Verify that every migrated action still opens its current dialog or route,
  and that state-ineligible actions are absent.
- Manually review Budgets, Pots, Transactions, Recurring Bills, Credit Cards,
  and the transaction library at desktop and mobile breakpoints.
- Run the repository formatter and applicable type, lint, and test commands.
