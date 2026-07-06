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
- Use `tabular-nums` when columns of numbers need to align.

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

### Page Composition

Common product page structure:

1. Page heading
2. Optional primary action row
3. Summary cards or filters
4. Main content card, table, or grid

Use mobile-first layout. Stack content on small screens, then introduce grids
and tables at `md` or `lg`.

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

- Use shadcn dialog, alert dialog, select, input, label, and form primitives
  unless a product-specific wrapper already exists.
- TanStack Form is the standard client form engine for data-entry forms.
- Zod is the standard validation schema layer. Client schemas should prevent
  known invalid input before submit, while server-side schemas remain the final
  authority for persisted data.
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

- Use icon-only overflow buttons for card-level edit/delete menus.
- Icons should be Lucide icons at `size-4` or `size-5`.
- Icon-only buttons need an `aria-label`.
- Menu items should use clear Title Case action labels.
- Destructive menu items use destructive text.

## Component Standards

### shadcn and Radix

This project uses shadcn `new-york` style, Radix primitives, Tailwind CSS v4,
Lucide icons, and `cn()` for class merging.

- Prefer components from `components/ui` before writing raw controls.
- Extend owned shadcn components when a variant is reused across the app.
- Keep component variants semantic: `default`, `secondary`, `outline`, `ghost`,
  `destructive`.
- Do not fork styling locally if the same need appears in multiple places.
- Avoid raw `button`, `input`, `select`, or `dialog` for reusable UI. Product
  wrappers are acceptable when they encode a local pattern.
- Tooltip groups are mandatory for nearby controls, button groups, and repeated
  icon-only actions. Wrap the group in one shared `TooltipProvider` and set a
  `skipDelayDuration` so moving quickly between tooltips opens the next tooltip
  instantly instead of replaying enter animations. Keep tooltip entrance
  animation tied to Radix's `delayed-open` state so `instant-open` tooltips are
  visually quiet.

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

Button labels should be action-specific: `Add Money`, `Create Budget`,
`Delete Pot`, `Save Changes`.

### Inputs

- Standard height is around 45px for auth/product forms.
- Use `rounded-lg`, tokenized border color, and `focus-visible:ring-ring`.
- Placeholder text should not replace a visible label.
- Search inputs should include an icon and remain compact in filter rows.

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

## Finance Data Rules

- Use formatting helpers from `lib/format` for currency and signed amounts.
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
- Finance data uses shared format helpers.
- The UI uses existing shadcn/product components where possible.
- `bun run format` has been run.
