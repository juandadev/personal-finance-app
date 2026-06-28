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

This project is built as a Frontend Mentor submission for the static comparison screenshot, while also serving as the foundation for a future full-stack personal finance app. It uses seeded finance data in JSON files and manages app changes on the client with React state, so users can explore realistic add, edit, delete, deposit, and withdrawal flows without needing a backend.

Changes are intentionally not persisted yet. You can interact with the controls, add budgets and pots, delete items, and move money around, but refreshing the page restores the original seed data. This keeps the challenge submission self-contained while the production-ready full-stack version is still in progress.

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

## Available Scripts

```bash
bun run dev          # Start the local development server
bun run build        # Create a production build
bun run start        # Start the production server
bun run lint         # Run ESLint
bun run lint:fix     # Fix lint issues where possible
bun run format       # Format files with Prettier
bun run format:check # Check formatting
```

## Project Structure

```txt
app/                  App Router routes, layouts, and global styles
components/           Feature components and reusable UI primitives
components/overview/  Dashboard summary cards and charts
components/budgets/   Budget management screens and dialogs
components/pots/      Savings pot cards and money movement dialogs
components/transactions/
                      Transaction table, filters, search, and pagination
components/recurring-bills/
                      Recurring bill summaries, filters, and table
data/                 Seeded challenge data
lib/                  Finance state, selectors, formatting, theme helpers
```

## Implementation Notes

The app uses a local `FinanceProvider` backed by `useReducer` to keep the challenge self-contained. Seed data from `data/` is transformed into view models through selectors in `lib/finance`, which keeps display components focused on rendering and user interaction.

Design tokens live in `app/globals.css`, while reusable primitives live in `components/ui`. This keeps the visual language consistent across charts, forms, navigation, dialogs, and data-heavy screens.

The current release is intentionally frontend-only. The next step is to connect the app to persistent data and turn it into a genuinely useful personal finance tool. That work will take more time, but the static version gives the challenge a finished submission while preserving a clean base for the full-stack version.

## What I Learned

This challenge was a good exercise in turning a static dashboard design into a more complete app experience. The most interesting parts were keeping the finance domain data normalized, deriving display-ready totals through selectors, and making dense table and chart layouts work cleanly across responsive breakpoints.

It was also a reminder that AI-generated UI can be very useful for exploration, but strong project rules, design documentation, and established component patterns matter a lot once the work moves from prototype to maintainable codebase.

## Author

- GitHub: [@juandadev](https://github.com/juandadev)
- Frontend Mentor: [@juandadev](https://www.frontendmentor.io/profile/juandadev)
