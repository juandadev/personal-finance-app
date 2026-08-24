# Frontend Mentor - Personal Finance App

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=nextdotjs)
![React](https://img.shields.io/badge/React-19-149ECA?style=for-the-badge&logo=react&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?style=for-the-badge&logo=tailwindcss&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)

A polished static solution to the [Personal finance app challenge on Frontend Mentor](https://www.frontendmentor.io/challenges/personal-finance-app-JfjtZgyMt1). The app recreates a full personal finance dashboard with responsive navigation, interactive financial data, budget tracking, savings pots, transactions, and recurring bills.

## Links

- Solution URL: https://www.frontendmentor.io/solutions/personal-finance-app---nextjs-tailwind-PNVxfZDpd0
- Challenge URL: https://www.frontendmentor.io/challenges/personal-finance-app-JfjtZgyMt1
- Live preview: https://personal-finance-app-nine-omega.vercel.app/

## Overview

This project began as a Frontend Mentor submission and now serves as a full-stack personal finance app with authenticated Neon Postgres persistence. Each signed-in user starts with an empty finance workspace and owns their data through PostgreSQL Row Level Security.

### Users Can

- View a finance overview with balance, income, expenses, savings pots, budgets, recent transactions, and recurring bills.
- Browse, search, sort, filter, paginate, add, edit, and delete transactions.
- Create, update, and delete budgets with themed category colors and spending summaries.
- Manage savings pots, including adding money, withdrawing money, editing targets, and deleting pots.
- Track recurring bills with paid, upcoming, and due soon summaries.
- Navigate comfortably across desktop, tablet, and mobile layouts.
- Visit the static auth screens directly at `/login` and `/sign-up`.
- Use accessible dialogs, menus, tables, form controls, and keyboard-friendly UI primitives.

## Project Background

This started as an experiment in how well frontier models could read and recreate product UIs from screenshots. I passed in the three responsive variants for each page, and the initial output was surprisingly accurate overall, including a solid first pass at the shadcn-style design tokens and project scaffolding.

The project began in [v0 by Vercel](https://v0.app/) because it is fast for validating UI ideas and automatically hosts previews on Vercel. After liking the challenge idea enough to turn it into a personal side project, I moved the code into a dedicated repository and continued refining it in Cursor.

That refinement involved a lot of cleanup. The first generated version leaned too much on custom components, hardcoded styles, and inline styling instead of fully using shadcn/ui primitives, Tailwind utilities, and reusable patterns. Since this app is becoming something I may use personally, I wanted the codebase to be organized, consistent, and pleasant for both humans and LLMs to work in.

## Design Approach

The goal was not strict pixel perfection at any cost. I prioritized a consistent system for spacing, type sizes, colors, component variants, and reusable layout patterns, even where that meant small differences from the sample Figma screenshots.

This challenge also became a useful experiment in design guidance for AI-assisted development. The project now includes a `DESIGN.md` file that acts as the design source of truth, helping future UI work follow the same principles and avoid drifting into inconsistent generated output.

## Built With

- [Next.js 16](https://nextjs.org/) with the App Router
- [React 19](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS 4](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/) and [Radix UI](https://www.radix-ui.com/)
- [Recharts](https://recharts.org/) for budget visualizations
- [Motion](https://motion.dev/) for interface transitions
- [Bun](https://bun.sh/) for package management and scripts

## Getting Started

### Prerequisites

Install [Bun](https://bun.sh/docs/installation) if you do not already have it available locally.

### Installation

```bash
bun install
```

Copy the environment template and fill it with values from Neon:

```bash
cp .env.example .env.local
```

Required values:

- `DATABASE_URL`: pooled Neon Postgres connection string for the app runtime.
- `DATABASE_DIRECT_URL`: direct Neon Postgres connection string for migrations.
- `AUTH_DATABASE_URL`: pooled connection string for a dedicated webhook login
  role that is a member of the migration-created `finance_auth_gate` NOLOGIN
  role. It must not reuse the finance runtime or database-owner role.
- `SCHEDULER_DATABASE_URL`: pooled connection string for the dedicated
  monthly-close login role. It must not reuse the web or owner role.
- `INVITATION_OPERATOR_DATABASE_URL`: optional direct connection string for a
  dedicated invitation operator. Invite commands fall back to
  `DATABASE_DIRECT_URL` when it is unset.
- `NEON_AUTH_BASE_URL`: Neon Auth branch URL.
- `NEON_AUTH_COOKIE_SECRET`: at least 32 characters, for example from `openssl rand -base64 32`.
- `CRON_SECRET`: at least 32 random bytes used only by the scheduled route.
- `PRIVACY_CONTROLLER_NAME`, `PRIVACY_CONTROLLER_ADDRESS`,
  `PRIVACY_CONTACT_EMAIL`, and `SECURITY_CONTACT_EMAIL`: production privacy
  notice and incident contacts.
- `NEXT_PUBLIC_ENABLE_ANALYTICS`: leave `false` for the closed beta unless the
  privacy notice and processor review explicitly cover Analytics.

### Development

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
bun run build
bun run start
```

### Database Setup

Apply the raw SQL schema:

```bash
bun run db:migrate
```

The schema uses normalized finance tables, UUID record IDs, integer cents, foreign keys, and PostgreSQL Row Level Security. Runtime queries are parameterized raw SQL through `pg`; no ORM is used.

### Beta Invitations

Migration `023_beta_invitations.sql` creates the invitation and processed
webhook-event tables, the `finance_auth_gate` NOLOGIN role, and one
`SECURITY DEFINER` authorization function. Create a dedicated Neon login role,
grant it membership in `finance_auth_gate`, and use that role only in
`AUTH_DATABASE_URL`. The role receives function execution only; it does not
receive direct access to either invitation table.

If you create a dedicated invitation operator instead of using the migration
owner, grant it only `CONNECT`, `USAGE` on `public`, and `SELECT`, `INSERT`, and
`UPDATE` on `public.beta_invitations`. It does not need access to
`public.auth_webhook_events` or the webhook authorization function.

Invitation records are keyed by normalized email and contain no raw invitation
token. Every command requires actor and reason metadata:

```bash
bun run auth:invites create person@example.com --expires-in 7d --actor juanda --reason "Private beta"
bun run auth:invites revoke person@example.com --actor juanda --reason "Access withdrawn"
bun run auth:invites list --status active
bun run auth:invites list --status all
```

### Neon Auth Production Configuration

The application code does not mutate Neon configuration. Complete these steps
for each production branch in the Neon Console or Neon API:

1. Configure the HTTPS webhook URL as
   `https://<trusted-app-domain>/api/webhooks/neon-auth`, enable only
   `user.before_create`, and use a timeout comfortably below Neon's 15-second
   global retry budget (5 seconds is the documented default).
2. Add every production application origin to Neon Auth trusted domains.
3. Enable required email verification. The authenticated layout rejects
   sessions whose `emailVerified` value is false.
4. Configure a custom SMTP provider for production delivery.
5. Configure production Google OAuth credentials. Register
   `{NEON_AUTH_BASE_URL}/callback/google` as Google's authorized redirect URI;
   the application origin remains the trusted post-auth callback URL.
6. Set the Auth application name and disable **Allow Localhost** on the
   production branch.

The webhook verifies Neon's detached Ed25519 JWS against
`{NEON_AUTH_BASE_URL}/.well-known/jwks.json`, checks timestamp freshness, and
fails closed. Do not put database credentials, OAuth secrets, or SMTP
credentials in source control.

## Available Scripts

```bash
bun run dev          # Start the local development server
bun run build        # Create a production build
bun run db:migrate   # Apply raw SQL migrations
bun run auth:invites # Create, revoke, or list beta invitations
bun run start        # Start the production server
bun run test         # Run the Bun test suite
bun run typecheck    # Type-check without emitting files
bun run lint         # Run ESLint
bun run lint:fix     # Fix lint issues where possible
bun run format       # Format files with Prettier
bun run format:check # Check formatting
bun run audit        # Fail on high or critical dependency advisories
bun run ci           # Run all local CI gates
```

## Project Structure

```txt
app/                  App Router routes, layouts, API handlers, and global styles
components/           Feature components and reusable UI primitives
components/overview/  Dashboard summary cards and charts
components/budgets/   Budget management screens and dialogs
components/pots/      Savings pot cards and money movement dialogs
components/transactions/
                      Transaction table, filters, search, and pagination
components/recurring-bills/
                      Recurring bill summaries, filters, and table
db/migrations/        Raw SQL schema migrations
lib/                  Auth, database, finance state, selectors, formatting, theme helpers
scripts/db/           Database migration runner
```

## Implementation Notes

The app uses Neon Auth for account access and a server-loaded `FinanceProvider` backed by `useReducer` for the client interaction model. Finance rows are loaded through raw SQL and transformed into view models through selectors in `lib/finance`, which keeps display components focused on rendering and user interaction.

Design tokens live in `app/globals.css`, while reusable primitives live in `components/ui`. This keeps the visual language consistent across charts, forms, navigation, dialogs, and data-heavy screens.

Database migrations live in SQL files and application queries use parameterized `pg` calls. User-owned rows are protected with Row Level Security and scoped by the authenticated Neon user id.

## What I Learned

This challenge was a good exercise in turning a static dashboard design into a more complete app experience. The most interesting parts were keeping the finance domain data normalized, deriving display-ready totals through selectors, and making dense table and chart layouts work cleanly across responsive breakpoints.

It was also a reminder that AI-generated UI can be very useful for exploration, but strong project rules, design documentation, and established component patterns matter a lot once the work moves from prototype to maintainable codebase.

## Author

- GitHub: [@juandadev](https://github.com/juandadev)
- Frontend Mentor: [@juandadev](https://www.frontendmentor.io/profile/juandadev)
