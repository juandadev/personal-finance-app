# Design Standards

This file is the source of truth for the app's design. Every change that creates
or modifies UI must read this file first and align with it. If a new design
decision is not covered here, update this file before implementing the UI.

The implementation of these standards lives primarily in `app/globals.css`,
`components/ui`, and the product components under `components`. Do not create
competing design rules in another file.

## Product Direction

This is a personal finance product. The interface should feel calm, precise, and
trustworthy. It should help people understand money quickly without visual noise.

- Prioritize clarity over decoration.
- Use warm neutral surfaces, strong charcoal text, and restrained teal accents.
- Make hierarchy with spacing, typography, and surfaces before adding color.
- Use color to communicate meaning: positive money, active navigation, budgets,
  warnings, and destructive actions.
- Keep finance data easy to scan on small screens and dense enough on desktop.
- Prefer familiar shadcn/Radix primitives over custom interaction patterns.

## Required UI Workflow

Before starting UI work:

1. Read this file.
2. Check existing nearby components for the current pattern.
3. Reuse tokens from `app/globals.css` and primitives from `components/ui`.
4. Update this file first if the desired UI needs a new design rule.
5. Verify responsive behavior, keyboard access, focus states, and formatting.

## Foundations

### Color

Use semantic Tailwind tokens (`bg-background`, `text-foreground`,
`bg-card`, `text-muted-foreground`, `border-border`, `ring-ring`) instead of
ad hoc palette classes.

Current light theme:

- Page background: `#f8f4f0` via `--background`
- Primary text and primary surfaces: `#201f24` via `--foreground` and
  `--primary`
- Cards and popovers: `#ffffff` via `--card` and `--popover`
- Secondary and muted surfaces: `#f2f3f7` via `--secondary` and `--muted`
- Secondary text: `#696868` via `--muted-foreground`
- Accent teal: `#277c78` via `--accent` and `--ring`
- Warning brown: `#be6c49` via `--warning`
- Destructive red: `#c94736` via `--destructive`
- Borders and inputs: `#ebe9e6` via `--border` and `--input`

Chart and category colors:

- Teal: `#277c78`
- Light cyan: `#82c9d7`
- Slate: `#626070`
- Peach: `#f2cdac`
- Lavender: `#b3a8c9`

Guidelines:

- Use `text-foreground` for primary copy and important values.
- Use `text-muted-foreground` for labels, metadata, helper text, and table
  headers.
- Use `bg-card` for primary content containers.
- Use `bg-background` for the page and subtle nested panels inside cards.
- Use `text-accent` for positive amounts and positive financial states.
- Use `text-warning` for warnings that need attention but are not overdue.
- Use `text-destructive` or `bg-destructive` only for destructive or error
  states.
- Budget and pot colors can be inline data colors when they represent a user or
  category identity. Pair them with text or numbers so color is not the only
  signal.
- Avoid hard-coded hex values in components unless wiring category data or
  adding a documented token.

### Typography

The app uses Public Sans through `--font-public-sans`. Use the Tailwind font
tokens already wired in `app/globals.css`.

- Page titles: `text-3xl font-bold tracking-tight md:text-4xl`
- Section and card titles: `text-xl font-bold tracking-tight`
- Large financial values: `text-3xl font-bold tracking-tight`
- Default body and control text: `text-sm`
- Metadata, labels, and table headers: `text-xs` or `text-sm`
- Use `font-bold` for names, labels that anchor a block, and money values.
- Use normal weight for secondary text. Avoid more than two weights in one view.
- Money amounts use `tabular-nums` via `MoneyAmount` so figures align in
  columns and lists.

### Spacing

Use a 4px-based rhythm. Prefer Tailwind spacing that maps to the existing app:

- Tight groups: `gap-1`, `gap-2`, `space-y-1`
- Related controls: `gap-3`, `gap-4`
- Card internals: `p-5`, `p-6`, `md:p-8`
- Between sections: `gap-6`, `gap-8`, `mt-6`, `mt-8`
- App shell content: `px-4 py-6 pb-24 md:px-10 md:py-8 lg:pb-10`

Keep each page on one density system. Do not mix very compact controls with
large editorial spacing in the same screen.

### Shape and Depth

- Default radius: `--radius: 0.75rem`
- Cards: `rounded-xl`
- Inputs and secondary action blocks: `rounded-lg`
- Icon-only controls and avatars: `rounded-full`
- Menus and popovers: `rounded-lg` or the shadcn default for that primitive
- Use `shadow-sm` for cards when separation is needed.
- Use borders and tonal surfaces before adding heavier shadows.
- Do not nest card inside card inside card. Use a subtle `bg-background`
  sub-panel for nested content.

### Motion

Motion should clarify a state change, not decorate the page.

- Use `transition-colors` for hover and active states.
- Keep overlays, dialogs, and popovers on the shadcn/Radix animation defaults.
- Prefer short transitions around 150-200ms.
- Use ease-out variants for enter animations, especially progress enter
  patterns such as charts or indicators filling from zero into a current value.
  The circular budget charts use `cubic-bezier(0.42, 1, 0.22, 1)`.
- Use ease-in-out variants for reversible state changes such as opening,
  closing, collapsing, or expanding navigation. The sidebar width transition
  uses the `ease-in-out-expo` token.
- Set animation duration per component so each surface can match its scale and
  context.
- Use an opacity-only fade when an element needs to suddenly disappear from or
  reappear on screen, such as sidebar labels during collapse and expand.
- Use blur plus opacity when one element switches to a different element in the
  same position, such as the sidebar collapse button icon changing direction.
- Avoid animation on controls or elements users are likely to trigger
  repeatedly. If the interaction frequency is unclear, ask for the developer's
  preference before adding motion.
- Use `motion` or a similar local pattern when it fits the component, but keep
  the animation behavior aligned with these principles.
- Avoid looping, bouncing, or attention-grabbing animation.
- Honor `prefers-reduced-motion` when adding custom motion.

Reference patterns:

```tsx
// Opacity-only fade for elements that appear or disappear.
<AnimatePresence initial={false} mode="popLayout">
  {isVisible && (
    <motion.span
      initial={shouldReduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
    >
      Label
    </motion.span>
  )}
</AnimatePresence>
```

```tsx
// Blur + opacity for switching between two elements in the same position.
<AnimatePresence initial={false} mode="popLayout">
  <motion.div
    key={isCollapsed ? "collapsed" : "expanded"}
    initial={shouldReduceMotion ? false : { opacity: 0, filter: "blur(2px)" }}
    animate={
      shouldReduceMotion ? { opacity: 1 } : { opacity: 1, filter: "blur(0px)" }
    }
    exit={
      shouldReduceMotion ? { opacity: 0 } : { opacity: 0, filter: "blur(2px)" }
    }
    transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
  >
    {isCollapsed ? <CollapsedIcon /> : <ExpandedIcon />}
  </motion.div>
</AnimatePresence>
```

## Layout Patterns

### App Shell

The product shell uses a dark sidebar on desktop and a dark bottom navigation on
mobile.

- Desktop navigation starts at `lg`.
- Mobile pages must leave room for the fixed bottom nav with `pb-24`.
- Keep page content inside the `AppShell` main padding unless a screen has a
  documented reason to break out.
- Page headings should sit above the main content and use `PageHeading`.
- Mount app-wide controls in the fixed `GlobalMenu` (inside the authenticated
  shell), not inside module `PageHeading` actions.

### Global Menu and Privacy Mode

`GlobalMenu` hosts app-wide toggles. On mobile (`< lg`), pin it to the
bottom-right just above the bottom navigation. On desktop (`lg+`), pin it to
the top-right.

- v1 includes privacy mode only: a shadcn `Toggle` with Phosphor `EyeIcon` /
  `EyeSlashIcon`.
- Pressed means amounts are hidden (`hideAmounts: true`).
- Icon-only toggle requires an action `aria-label` (“Hide amounts” /
  “Show amounts”) and a tooltip that includes the same label plus a `Kbd`
  shortcut hint (`⇧⌘.` on Apple platforms, `Ctrl+⇧+.` elsewhere).
- Keyboard shortcut `Mod+Shift+.` toggles privacy anywhere in the signed-in
  app, including while focused in form fields (`react-hotkeys-hook` with
  `enableOnFormTags` and `enableOnContentEditable`).
- Privacy preference syncs across devices via `profiles.ui_preferences`
  JSONB. Do not store it in `localStorage`.
- Default is amounts visible (`hideAmounts: false`).
- `MoneyAmount` uses shared `PrivacyValue` for masking. For other sensitive
  non-money UI, wrap content in `PrivacyValue` yourself after a manual
  inspection — there is no requirement to mask everything by default.
- In the transactions list, credit-card payment-method badges keep their
  chrome and only hide the label text while privacy mode is on (card nickname
  / last four / payment labels). Voucher and other non-card badges stay
  visible. Do not wrap these badges in `PrivacyValue`.

### Page Headings

Use `PageHeading` for module titles and header actions. On mobile, pass `fixed`
so the heading stays pinned while the page scrolls beneath it. At `lg`, the
heading returns to normal flow inside the shell. Adding `fixed` does not require
changing the page's existing layout, grid, or scroll behavior.

### Page Composition

Common product page structure:

1. Page heading
2. Optional primary action row
3. Summary cards or filters
4. Main content card, table, or grid

Use mobile-first layout. Stack content on small screens, then introduce grids
and tables at `md` or `lg`.

### Module Headers and Actions

Actionable module headers use a `justify-between` layout: the title stays on
the left and its action area stays right-aligned.

- Show one visible primary action in a module header.
- When secondary header actions exist, place them in one icon-only ellipsis
  menu beside the primary action. Do not show multiple visible header buttons.
- Header ellipsis triggers require an accessible name. Use the shared header
  action wrapper so mobile layouts preserve the title and action area without
  overflow.
- Dashboard navigation links such as `See Details` and `View All` are valid
  single header actions for read-only summary modules.

### Cards

Cards are the primary product surface.

- Use `bg-card rounded-xl p-5 md:p-8` for full page cards.
- Use `bg-card rounded-xl p-6 shadow-sm` for dashboard summary cards.
- Use `bg-primary text-primary-foreground` only for the most important summary
  card in a group.
- Use `CardHeader` patterns: title on the left, secondary link/action on the
  right with a chevron when navigating.

### Tables and Lists

Finance data must stay readable on mobile.

- On desktop, use tables for dense data.
- On mobile, convert tables to list rows with clear primary and secondary text.
- Keep names and amounts bold.
- Keep dates, categories, and helper metadata muted.
- Use dividers with `divide-muted-foreground/10` or `border-muted-foreground/10`
  for lightweight separation.
- Right-align money amounts in tables.

### Forms and Dialogs

- Use shadcn dialog, alert dialog, select, input, date picker, label, and form
  primitives unless a product-specific wrapper already exists.
- Date fields use the shared `DatePicker` (`Popover` + `Calendar`), never native
  `input type="date"`. iOS Safari paints its own date control with different
  padding, format, and an intrinsic min-width that overflows dialogs; Chrome’s
  device toolbar does not reproduce that. Store `yyyy-MM-dd` in form state and
  show the selected value with `formatDisplayDate`. Cap selectable days with
  `min` / `max` on the picker, not native `min` / `max` attributes.
- TanStack Form is the standard client form engine for data-entry forms.
- Zod is the standard validation schema layer. Client schemas should prevent
  known invalid input before submit, while server-side schemas remain the final
  authority for persisted data.
- Transaction and payment dates that apply balance or settlement effects
  immediately must default to and be capped at the profile-local current date.
  Historical dates remain valid, and the server must reject future dates.
- Use `AlertDialog` for destructive confirmations.
- Labels are required for every input.
- Helper text should be muted and specific.
- Field validation errors replace or sit alongside helper text in a destructive
  helper style. Every invalid field must include `aria-invalid`, an associated
  helper/error message, and tokenized destructive styling.
- Forms validate on submit first. After the first failed submit attempt,
  validation updates live as users edit fields.
- Every submit attempt clears stale form and field errors before validating the
  current values again.
- Form-level validation and submit errors appear below the main form fields and
  above the primary submit button.
- Primary submit actions should be full-width on auth forms and right-aligned or
  grouped in dialogs.
- Auth email/password forms must use `method="post"` and a Server Action as the
  form `action` so sign-in and sign-up still work if the browser submits before
  client JS hydrates (common on phones and password managers). Never rely on a
  client `onSubmit` handler alone; a GET fallback puts credentials in the URL
  and reloads an empty form.
- Long finance dialog forms should use `DialogFinanceForm` so submit actions,
  status messages, and destructive buttons stay pinned at the bottom while
  fields scroll independently inside `DialogBody`.
- Destructive actions must use destructive color and explicit labels like
  `Delete Budget`, not vague labels like `OK`.
- Auth and API-backed forms should show inline status messages near the submit
  action. Use destructive styling for errors, muted/foreground copy for
  progress, and concise success copy when the view does not immediately
  redirect or close. Error messages should use sentence case, explain what to
  fix, and avoid vague copy.
- A Server Action call must never leave the user without feedback. Resolve
  every action with a `{ ok, message }` result (see
  `lib/finance/reducer.ts#runFinanceAction`) instead of letting the call
  reject, and always render `result.message` through the inline status
  message when `ok` is `false`.

### Account & Data

- Keep account controls in a dedicated Settings page with separate cards for
  identity, portable data, privacy information, and destructive actions.
- Describe exports and deletion in plain language before presenting the action;
  state what is included, whether the action is reversible, and what remains in
  time-limited backups.
- Data export is a secondary action. Account deletion uses a destructive button,
  an `AlertDialog`, an exact typed confirmation phrase, and current-password
  verification when the account supports password sign-in.
- Keep the privacy notice reachable from Settings and signed-out auth screens.
  Legal placeholders or review notes belong in source documentation, not in
  polished user-facing copy.

### Error States

- Route-level crashes use the `app/error.tsx` boundary: a centered `Card` with
  a destructive icon badge, a short title, one sentence of plain-language
  explanation, a `Try Again` button (`reset()`), and a secondary link back to
  `/`.
- `app/global-error.tsx` is the last-resort fallback when the root layout
  itself fails. It cannot assume any providers are mounted, so it stays
  minimal: plain tokens, no shadcn primitives, no `EmptyDataCard`.
- Prefer the inline status message pattern (above) for expected, recoverable
  failures inside a form or dialog. Reserve the full-page error boundary for
  unexpected render-time crashes.

### Menus and Secondary Actions

- Use the shared item-level icon-only ellipsis button for secondary actions on
  managed cards and list/table rows.
- Icons should be Phosphor filled icons imported directly from
  `@phosphor-icons/react` using `Icon`-suffixed exports (e.g. `ReceiptIcon`)
  with `weight="fill"`, sized at Tailwind `size-4` or `size-5`.
- Icon-only buttons need an `aria-label`.
- Menu items should use clear Title Case action labels.
- Destructive menu items use destructive text.
- Cards and list/table rows may show at most two dedicated action buttons.
  Reserve them for high-frequency, task-completion flows such as paying a
  bill, moving money, viewing card details, or settling a statement.
- Record-management actions such as Edit, Delete, and Archive belong in the
  item ellipsis menu by default.
- Selectors, toggles, and inline data-entry controls do not count toward the
  two-action limit.
- Empty-state calls to action are exempt because they provide onboarding rather
  than per-record management.
- Keep header-level and item-level ellipsis menus as separate variants: header
  menus contain secondary module actions; item menus contain actions for one
  record.
- Actions menus must not open on touch pointer-down. On touch and pen input,
  open the menu only after a tap (pointer up without a drag) so a scroll that
  starts on the ellipsis does not interrupt scrolling or leave the menu open.
  Mouse and keyboard continue to open on press or key activation.

## Component Standards

### shadcn and Radix

This project uses shadcn `new-york` style, Radix primitives, Tailwind CSS v4,
Phosphor filled icons (`@phosphor-icons/react`), and `cn()` for class merging.

- Prefer components from `components/ui` before writing raw controls.
- Extend owned shadcn components when a variant is reused across the app.
- Keep component variants semantic: `default`, `secondary`, `outline`, `ghost`,
  `destructive`.
- Do not fork styling locally if the same need appears in multiple places.
- Avoid raw `button`, `input`, `select`, or `dialog` for reusable UI. Product
  wrappers are acceptable when they encode a local pattern.

### Icons

- Import from `@phosphor-icons/react` using Phosphor's `Icon`-suffixed exports,
  e.g. `import { ReceiptIcon } from "@phosphor-icons/react"`.
- Set `weight="fill"` on every Phosphor icon except the loading spinner
  (`CircleNotch`).
- Size with Tailwind `size-4` / `size-5` or Phosphor's `size` prop.
- Custom Figma SVG icons in `components/icons/` are reserved for navigation,
  payment brand logos, and the sidebar collapse control only.
- `components.json` uses `"iconLibrary": "phosphor"` for shadcn CLI installs.

- Tooltip groups are mandatory for nearby controls, button groups, and repeated
  icon-only actions. Wrap the group in one shared `TooltipProvider` and set a
  `skipDelayDuration` so moving quickly between tooltips opens the next tooltip
  instantly instead of replaying enter animations. Keep tooltip entrance
  animation tied to Radix's `delayed-open` state so `instant-open` tooltips are
  visually quiet.
- Tooltips are hover-only. Do not show them on touch or coarse-pointer devices
  (phones and tablets). Icon-only controls still need an accessible name; never
  rely on a tooltip for essential mobile information.

### Buttons

- Primary action: `bg-primary text-primary-foreground`
- Secondary action: `bg-background` or `variant="secondary"` depending on
  surrounding surface
- Low-emphasis action: `variant="ghost"` or muted link styling
- Destructive action: `variant="destructive"` or destructive text in a menu
- Input-like trigger: `variant="input"` for picker buttons that should match
  regular form inputs, such as date picker triggers.
- Icon-only action: `size-9` to `size-11`, rounded full, with a visible focus
  ring and an accessible name
- Filter rows may expose a low-emphasis reset action only when their state
  differs from its defaults. Use an icon-only ghost button at every breakpoint
  with a descriptive `aria-label` and the shared tooltip pattern.

Button labels should be action-specific: `Add Money`, `Create Budget`,
`Delete Pot`, `Save Changes`.

### Inputs

- Standard height is around 45px for auth/product forms.
- Use `rounded-lg`, tokenized border color, and `focus-visible:ring-ring`.
- Placeholder text should not replace a visible label.
- Search inputs should include an icon and remain compact in filter rows.
- Date controls use the input-like `Button` trigger (`variant="input"` /
  `size="input"`) so padding and height match other fields on every device.

### Navigation

- Active navigation uses the sidebar accent treatment and clear text contrast.
- Inactive navigation is muted but readable.
- Keep nav labels stable and short: `Overview`, `Transactions`, `Budgets`,
  `Pots`, `Recurring Bills`.
- Use `aria-label` on primary navigation landmarks.

### Progress and Charts

- Progress bars must include adjacent numeric context such as percentage,
  amount spent, remaining amount, or target.
- Category colors are allowed for bars and dots, but the label and value must
  carry the meaning.
- Charts should use the documented chart palette before adding new colors.
- Avoid decorative charts that do not answer a finance question.

### Forecast Charts

- Forecast modules use a composed monthly chart: `chart-1` income bars,
  `chart-4` outflow bars, and a `chart-3` ending-balance line. Negative balance
  points and balance labels use `destructive` plus explicit negative text or
  signs.
- Show 13 ordered month targets: the current local calendar month followed by
  the next 12 months. Pin the current month initially. A pinned month controls
  the related activity report; hover and keyboard focus may preview only the
  prominent balance value without changing that report.
- Pointer exit and focus loss restore the pinned value. Click, tap, Enter, or
  Space pins a month, while Left and Right Arrow move focus between month
  targets.
- Every month target must be a real keyboard and touch control with an
  accessible label that names its month, income, outflows, monthly change, and
  ending balance. Do not rely on a chart tooltip for access to forecast data.
- De-emphasize inactive months with opacity while keeping labels readable.
  Mobile plots use horizontal scrolling and tap-to-pin; targets remain at least
  44px wide. Honor reduced motion and disable decorative chart animation.

### Cash Forecast

- Use `Cash Forecast` as the page title and `Forecast` as its navigation label.
  The page header exposes `Add Forecast Item` as its one primary action and
  keeps `Edit Monthly Income` in the header ellipsis menu.
- Missing monthly-income settings auto-open setup, keep the report unavailable,
  and fall back to an inline `Set Monthly Income` state when dismissed. A saved
  zero value is valid.
- Missing primary payment accounts and unsupported mixed currencies are
  blocking setup states. Negative projected balances and zero-activity months
  remain valid report states.
- Forecast activity uses 10 parent rows per page. Credit-card statement
  children expand beneath their parent and do not count toward pagination.
  Desktop uses the dense table pattern; mobile uses stacked list rows.
- The current month is a today-plus-pending runway. Its activity list shows
  posted primary-account cash movements already in today's balance plus pending
  forecast items, and every row visibly says `Actual` or `Pending`. Total
  Income, Total Outflows, and Monthly Change sum the listed rows so they match
  the table. The current-month ending balance still uses today's live balance
  plus pending income minus pending outflows. Empty copy names both actual and
  pending activity.
- The current-month summary shows today's actual balance, pending income
  (remaining default income plus additional income), and pending outflows.
  Future months remain projections, and the saved default monthly income starts
  with the first future month.
- User-created additional-income and planned-outflow adjustments may be
  one-time or repeat monthly from their selected start month. They remain
  pending forecast-only entries until edited or deleted.
- User-created forecast adjustments expose item-level Edit and Delete in an
  overflow menu, plus Exclude/Include for the pinned month only. Excludable
  generated rows (`budget_projection`, `default_income`, `recurring_bill`)
  expose Exclude/Include as a text action. Exclusions persist and keep the row
  visible muted and struck through while totals and the chart ignore the
  amount. Generated excludable rows also show a compact muted `Projected` cue
  beside the Source text. Credit card and actual cash rows remain plain
  Read-only. Global Budget projections opt-in remains the horizon-wide budget
  gate.
- Inside the summary chart card, above the color legend and chart, a
  collapsible Budget projections control (collapsed by default) lists active
  budgets as compact checkbox + name rows. Desktop wraps them in a row; mobile
  stacks them in a column. Toggles save immediately (no separate Save action);
  while a save is in flight, disable further toggles and show a small loading
  state. Selection persists by category so it survives monthly budget copy.
  Never show raw category ids. Empty state can briefly point users to Budgets.
- Budget create/edit dialogs include a Monthly voucher coverage field
  (`$0` allowed, must not exceed the budget limit). Forecast uses only
  `limit − coverage` as expected cash for opted-in budgets.

### Budgets

- Within budget: remaining and free amounts use `text-foreground`; progress
  tracks use `bg-background`.
- Over budget: exceeded amounts and over-limit percentages use
  `text-destructive`; progress tracks use `bg-destructive/15`.
- The overview budgets list shows **spent** money per category. Over-limit
  amounts use destructive styling.
- Budget category cards keep **Free** with the remaining amount when within
  budget. When over budget, switch the label to **Exceeded** and show the
  positive overage amount in destructive styling.
- Do not rely on color alone to communicate over-budget state. Pair destructive
  styling with label and numeric context.

### Recurring Bills

- A bill's identity comes from its contact: rows use the shared `ContactAvatar`
  with initials fallback, never raw images.
- Occurrence statuses use fixed labels and icon + color together: `Paid`
  (check, `accent`), `Skipped` (muted), `Upcoming` (muted foreground),
  `Due Soon` and `Due Today` (warning icon, `warning` text), `Overdue`
  (warning icon, `destructive` text).
- Bill title rows show the contact avatar, concept, contact name, and a card
  icon when the bill charges to a credit card. The card icon links to that
  card's detail page and shows a small theme-color dot beside it for quick
  visual reference. Hovering it shows a tooltip with the card nickname and
  last four digits (`Travel Card •••• 4242`). Wrap that tooltip text in
  `PrivacyValue` so privacy mode masks the card details.
- The due-date column shows the schedule label (`Monthly`, `Yearly`, or
  `Payment N of M` for finite bills) with a short anchor date (`1st`,
  `Aug 15th`, etc.) plus the occurrence status label and icon. Hovering the
  short date shows a tooltip with the next due date as
  `Monday, 27 Jul, 2026` (`EEEE, d MMM, yyyy` via `formatDisplayDate`).
- `Latest` and `Oldest` sort by urgency first (`Overdue`, `Due Today`,
  `Due Soon`, `Upcoming`, then paid/other). Within each status, `Latest` is
  soonest next due date first and `Oldest` is furthest first.
- Mobile bill rows stay compact: avatar, concept, contact, a short schedule line
  (`Monthly - 1st`, `Yearly - Aug 15th`) with the status icon, amount, and an
  overflow menu. The short date uses the same full-date hover tooltip as
  desktop, which does not appear on touch devices. `Pay Bill` and `Skip` live
  in that menu on mobile.
- The bill dialog locks `frequency` and `first due date` once a bill has any
  settled payment. Locked fields render disabled with helper text explaining
  to archive and recreate the bill to reschedule frequency. Resume is the
  allowed path to set a new start date without recreating the bill.
- Paying an occurrence always asks for the payment source: the bank account or
  one of the user's credit cards (using `CreditCardBadge`).
- Skip, Pause, Cancel, and Resume are confirmed with `AlertDialog`. Skipping
  records no money movement. For **card-assigned** bills, Pause and Cancel
  schedule an end on the next due date after today: the bill stays in the
  Active list with `Pauses on …` / `Cancels on …` until that date, the current
  statement charge is always kept, and that end date is never charged. Undo
  clears a pending end before it takes effect. After the end date, Cancel moves
  the bill to Archived and Pause moves it to Paused (resumable with a new start
  date on or after today). **Non-card** Pause and Cancel stop immediately from
  today.
- Card-assigned bill occurrences render inside the card's statement history as
  pending lines: muted row, `Pending` badge, due date. Statement balances
  shown anywhere include pending bill amounts.
- Active bills stay in the main list. Paused bills appear under a `Paused`
  group with muted styling, `Resume` and `Cancel` actions, and no pay/skip.
  Archived bills appear under `Archived` with the same muted treatment and no
  resume action.
- Overview left column includes a **Due for payment** card under Transactions.
  It lists active manual bills (no credit card) whose current status is
  `Overdue`, `Due Today`, or `Due Soon`. Show at most 4 rows; empty state copy
  is “You’re all caught up” with a short line that no manual bills need payment
  soon. Rows and `View All` deep-link to Recurring Bills filtered by
  `source=bank_account` and those three statuses. This card is a reminder only
  (no pay/skip). The right-column Recurring Bills summary buckets stay as-is.

### Credit Cards

- Card-level balances use the `Total Pending` label and include every unpaid
  statement, including pending card-assigned bill amounts and pending annuality
  installments.
- Optional card-level **Annuality** (annual fee) is configured in Add/Edit Card:
  enable toggle, full amount, anniversary month/day, and payment count (default
  1). When count is greater than 1, the fee splits across consecutive statement
  cycles starting with the cycle that contains the anniversary date.
- Credit Card Details shows an Annuality section when enabled: current-year
  schedule, editable installment amounts for non-posted payments when split,
  Save amounts, and Reset to equal. Overrides apply only to that anniversary
  year. Subtitle stacks amount/year above anniversary and payment-count details.
  On small screens, installment rows stack label above amount, and Save / Reset
  live in the shared ellipsis overflow menu; desktop keeps inline actions.
- Pending annuality lines use the label `Annuality` on statements and in the pay
  dialog; paying a statement materializes them as card purchases. Future unpaid
  installments count toward Reserved Installments / available credit like finite
  card bills.
- Card-level status uses the most urgent unpaid statement: `Overdue`, then `Due
Today`, then `Due Soon`, then `Upcoming`. `Overdue` uses destructive text.
- When a card-level payment targets the oldest payable statement, the dialog
  explains that selection, emphasizes the statement period, and offers a
  secondary route to card details for choosing another statement.
- On Credit Card Details, each statement with a non-zero purchase amount or
  pending bills exposes a `View statement transactions` text link under the
  period and due date (shared card action-link styling). It opens Transactions
  filtered to that card and inclusive statement period (`card`, `from`, `to`).
- Credit Card Details does not list Card Transactions inline; statement-scoped
  review and edits happen on Transactions via that deep-link.
- Credit Card Details shows a Recurring Bills section for monthly and yearly
  bills assigned to the card, including archived bills (muted, no actions).
  Active rows expose edit-only actions via the shared bill dialog. One-time
  card charges remain in Scheduled Charges only.
- The Recurring Bills section header includes a `Manage recurring bills` link
  that opens Recurring Bills filtered by that card (`card`).

## Finance Data Rules

- Render on-screen money with the shared `MoneyAmount` component. Keep raw
  formatting in `lib/format`; do not call format helpers directly in product UI
  for displayed amounts. `MoneyAmount` always applies `tabular-nums`.
- Active editable inputs (`CurrencyInput`) stay outside `MoneyAmount` and remain
  visible while privacy mode is on.
- When the absolute value is ≥ `$100,000`, `MoneyAmount` shows compact notation
  at rest and reveals the full amount on hover/focus (privacy off only).
- When privacy mode is on, `MoneyAmount` replaces the value with a static
  (non-pulsing) skeleton sized to the resting text box. Do not reveal the number
  via hover or the accessibility tree; announce that the amount is hidden and
  privacy mode must be turned off.
- Chart axis ticks, tooltips, and a11y value text that include money must respect
  the same privacy flag.
- Use `date-fns` through shared helpers in `lib/format` for all user-facing date
  text. Do not render raw ISO dates outside form controls that require them.
- Positive amounts use a plus sign and `text-accent`.
- Negative or outgoing amounts use normal foreground text unless representing an
  error or destructive state.
- Always show enough context for money values: label, category, date, or target.
- Use two decimals for balances, budgets, and saved amounts when precision
  matters.
- Do not rely on color alone to communicate income, spending, warning, or
  progress.

## Accessibility

Accessibility is part of the visual standard.

- Use semantic landmarks: `header`, `main`, `nav`, `section`, `article`, `table`.
- Preserve a logical heading order.
- Every interactive element must be keyboard reachable.
- Every interactive element must have a visible `focus-visible` state.
- Never remove an outline without replacing it with a tokenized focus ring.
- Icon-only controls require an `aria-label`.
- Decorative images and icons should use empty alt text or `aria-hidden`.
- Form controls need visible labels.
- Maintain WCAG AA contrast for text and controls.
- Do not communicate state with color alone.

## Content Voice

The interface should sound concise and useful.

- Use Title Case for page titles, card titles, buttons, menu items, tabs, and
  nav labels.
- Use sentence case for body copy, helper text, validation messages, and empty
  states.
- Use verbs in action labels: `Add Money`, `Edit Budget`, `Delete Pot`.
- Avoid vague labels: `OK`, `Confirm`, `Submit`.
- Empty states should point to the next action.
- Loading states should name the thing in progress: `Saving...`, `Loading
transactions...`.
- Errors should say what happened and what to do next.
- Avoid marketing language, filler, and exclamation points.

## Quality Checklist

Before shipping UI work:

- The change follows this `DESIGN.md`.
- New visual decisions are documented here.
- Colors use semantic tokens or documented category data.
- Spacing and radius match existing app patterns.
- Mobile and desktop states are both designed.
- Keyboard, focus, labels, and contrast are covered.
- Finance data uses `MoneyAmount` for on-screen amounts (formatters in
  `lib/format`).
- The UI uses existing shadcn/product components where possible.
- `bun run format` has been run.
