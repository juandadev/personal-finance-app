import { Home, ArrowDownUp, ChartPie, PiggyBank, ReceiptText } from "lucide-react"
import type { Budget, NavItem, Pot, RecurringBillSummary, SummaryStat, Transaction } from "./types"

export const navItems: NavItem[] = [
  { key: "overview", label: "Overview", icon: Home, href: "/" },
  { key: "transactions", label: "Transactions", icon: ArrowDownUp, href: "/transactions" },
  { key: "budgets", label: "Budgets", icon: ChartPie, href: "/budgets" },
  { key: "pots", label: "Pots", icon: PiggyBank, href: "/pots" },
  { key: "recurring-bills", label: "Recurring Bills", icon: ReceiptText, href: "/recurring-bills" },
]

export const summaryStats: SummaryStat[] = [
  { label: "Current Balance", amount: 4836.0, variant: "primary" },
  { label: "Income", amount: 3814.25, variant: "default" },
  { label: "Expenses", amount: 1700.5, variant: "default" },
]

export const pots: Pot[] = [
  { name: "Savings", amount: 159, color: "var(--color-chart-1)" },
  { name: "Gift", amount: 40, color: "var(--color-chart-2)" },
  { name: "Concert Ticket", amount: 110, color: "var(--color-chart-3)" },
  { name: "New Laptop", amount: 10, color: "var(--color-chart-4)" },
]

export const totalSaved = pots.reduce((sum, pot) => sum + pot.amount, 0) + 531 // matches design's $850 total

export const budgets: Budget[] = [
  { category: "Entertainment", amount: 50, color: "var(--color-chart-3)" },
  { category: "Bills", amount: 750, color: "var(--color-chart-2)" },
  { category: "Dining Out", amount: 75, color: "var(--color-chart-1)" },
  { category: "Personal Care", amount: 100, color: "var(--color-chart-4)" },
]

export const budgetSpent = 338
export const budgetLimit = 975

export const transactions: Transaction[] = [
  {
    id: "t-1",
    name: "Emma Richardson",
    avatarUrl: "/placeholder.svg?height=80&width=80",
    amount: 75.5,
    date: "19 Aug 2024",
  },
  {
    id: "t-2",
    name: "Savory Bites Bistro",
    avatarUrl: "/placeholder.svg?height=80&width=80",
    amount: -55.5,
    date: "19 Aug 2024",
  },
  {
    id: "t-3",
    name: "Daniel Carter",
    avatarUrl: "/placeholder.svg?height=80&width=80",
    amount: -42.3,
    date: "18 Aug 2024",
  },
  {
    id: "t-4",
    name: "Sun Park",
    avatarUrl: "/placeholder.svg?height=80&width=80",
    amount: 120.0,
    date: "17 Aug 2024",
  },
  {
    id: "t-5",
    name: "Urban Services Hub",
    avatarUrl: "/placeholder.svg?height=80&width=80",
    amount: -65.0,
    date: "17 Aug 2024",
  },
]

export const recurringBills: RecurringBillSummary[] = [
  { label: "Paid Bills", amount: 190.0, color: "var(--color-chart-1)" },
  { label: "Total Upcoming", amount: 194.98, color: "var(--color-chart-4)" },
  { label: "Due Soon", amount: 59.98, color: "var(--color-chart-2)" },
]
