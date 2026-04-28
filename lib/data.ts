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
  { name: "Savings", amount: 159, target: 2000, color: "#277C78" },        // teal
  { name: "Concert Ticket", amount: 110, target: 150, color: "#626070" },  // dark gray
  { name: "Gift", amount: 40, target: 60, color: "#82C9D7" },              // cyan
  { name: "New Laptop", amount: 10, target: 1000, color: "#F2CDAC" },      // peach
  { name: "Holiday", amount: 531, target: 1440, color: "#826CB0" },        // purple
]

export const totalSaved = pots.reduce((sum, pot) => sum + pot.amount, 0)

export const budgets: Budget[] = [
  { category: "Entertainment", maximum: 50, spent: 15, color: "#277C78" },  // teal
  { category: "Bills", maximum: 750, spent: 150, color: "#82C9D7" },        // light cyan
  { category: "Dining Out", maximum: 75, spent: 133, color: "#F2CDAC" },    // peach
  { category: "Personal Care", maximum: 100, spent: 40, color: "#626070" }, // slate
]

export const budgetSpent = budgets.reduce((sum, b) => sum + b.spent, 0)
export const budgetLimit = budgets.reduce((sum, b) => sum + b.maximum, 0)

export const transactions: Transaction[] = [
  {
    id: "t-1",
    name: "Emma Richardson",
    avatarUrl: "https://i.pravatar.cc/80?img=1",
    amount: 75.5,
    date: "19 Aug 2024",
    category: "General",
  },
  {
    id: "t-2",
    name: "Savory Bites Bistro",
    avatarUrl: "https://i.pravatar.cc/80?img=12",
    amount: -55.5,
    date: "19 Aug 2024",
    category: "Dining Out",
  },
  {
    id: "t-3",
    name: "Daniel Carter",
    avatarUrl: "https://i.pravatar.cc/80?img=3",
    amount: -42.3,
    date: "18 Aug 2024",
    category: "General",
  },
  {
    id: "t-4",
    name: "Sun Park",
    avatarUrl: "https://i.pravatar.cc/80?img=4",
    amount: 120.0,
    date: "17 Aug 2024",
    category: "General",
  },
  {
    id: "t-5",
    name: "Urban Services Hub",
    avatarUrl: "https://i.pravatar.cc/80?img=15",
    amount: -65.0,
    date: "17 Aug 2024",
    category: "General",
  },
  {
    id: "t-6",
    name: "Liam Hughes",
    avatarUrl: "https://i.pravatar.cc/80?img=6",
    amount: 65.75,
    date: "15 Aug 2024",
    category: "Groceries",
  },
  {
    id: "t-7",
    name: "Lily Ramirez",
    avatarUrl: "https://i.pravatar.cc/80?img=7",
    amount: 50.0,
    date: "14 Aug 2024",
    category: "General",
  },
  {
    id: "t-8",
    name: "Ethan Clark",
    avatarUrl: "https://i.pravatar.cc/80?img=8",
    amount: -32.5,
    date: "13 Aug 2024",
    category: "Dining Out",
  },
  {
    id: "t-9",
    name: "James Thompson",
    avatarUrl: "https://i.pravatar.cc/80?img=9",
    amount: -5.0,
    date: "11 Aug 2024",
    category: "Entertainment",
  },
  {
    id: "t-10",
    name: "Pixel Playground",
    avatarUrl: "https://i.pravatar.cc/80?img=20",
    amount: -10.0,
    date: "11 Aug 2024",
    category: "Entertainment",
  },
  {
    id: "t-11",
    name: "Ella Phillips",
    avatarUrl: "https://i.pravatar.cc/80?img=21",
    amount: -45.0,
    date: "10 Aug 2024",
    category: "Shopping",
  },
  {
    id: "t-12",
    name: "Sofia Peterson",
    avatarUrl: "https://i.pravatar.cc/80?img=22",
    amount: 105.0,
    date: "9 Aug 2024",
    category: "General",
  },
  {
    id: "t-13",
    name: "Mason Martinez",
    avatarUrl: "https://i.pravatar.cc/80?img=13",
    amount: -88.25,
    date: "8 Aug 2024",
    category: "Bills",
  },
  {
    id: "t-14",
    name: "William Harris",
    avatarUrl: "https://i.pravatar.cc/80?img=14",
    amount: -22.0,
    date: "7 Aug 2024",
    category: "Transportation",
  },
  {
    id: "t-15",
    name: "Spark Electric Solutions",
    avatarUrl: "https://i.pravatar.cc/80?img=25",
    amount: -150.0,
    date: "6 Aug 2024",
    category: "Bills",
  },
  {
    id: "t-16",
    name: "Ava Robinson",
    avatarUrl: "https://i.pravatar.cc/80?img=16",
    amount: 200.0,
    date: "5 Aug 2024",
    category: "General",
  },
  {
    id: "t-17",
    name: "Buzz Marketing Group",
    avatarUrl: "https://i.pravatar.cc/80?img=27",
    amount: -35.0,
    date: "4 Aug 2024",
    category: "Entertainment",
  },
  {
    id: "t-18",
    name: "Serenity Spa & Wellness",
    avatarUrl: "https://i.pravatar.cc/80?img=28",
    amount: -89.0,
    date: "3 Aug 2024",
    category: "Personal Care",
  },
  {
    id: "t-19",
    name: "Harper White",
    avatarUrl: "https://i.pravatar.cc/80?img=19",
    amount: 75.0,
    date: "2 Aug 2024",
    category: "General",
  },
  {
    id: "t-20",
    name: "Aqua Flow Utilities",
    avatarUrl: "https://i.pravatar.cc/80?img=30",
    amount: -45.0,
    date: "1 Aug 2024",
    category: "Bills",
  },
  {
    id: "t-21",
    name: "Rina Sato",
    avatarUrl: "https://i.pravatar.cc/80?img=31",
    amount: -10.0,
    date: "13 Jul 2024",
    category: "Entertainment",
  },
  {
    id: "t-22",
    name: "Bravo Zen Spa",
    avatarUrl: "https://i.pravatar.cc/80?img=32",
    amount: -25.0,
    date: "29 Aug 2024",
    category: "Personal Care",
  },
  {
    id: "t-23",
    name: "Sofia Peterson",
    avatarUrl: "https://i.pravatar.cc/80?img=22",
    amount: -15.0,
    date: "15 Aug 2024",
    category: "Personal Care",
  },
  {
    id: "t-24",
    name: "Ella Phillips",
    avatarUrl: "https://i.pravatar.cc/80?img=21",
    amount: -45.0,
    date: "10 Aug 2024",
    category: "Dining Out",
  },
]

export const transactionCategories: Transaction["category"][] = [
  "Entertainment",
  "Bills",
  "Groceries",
  "Dining Out",
  "Transportation",
  "Personal Care",
  "Education",
  "Lifestyle",
  "Shopping",
  "General",
]

export const recurringBills: RecurringBillSummary[] = [
  { label: "Paid Bills", amount: 190.0, color: "var(--color-chart-1)" },
  { label: "Total Upcoming", amount: 194.98, color: "var(--color-chart-4)" },
  { label: "Due Soon", amount: 59.98, color: "var(--color-chart-2)" },
]
