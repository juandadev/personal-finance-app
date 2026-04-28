import type { LucideIcon } from "lucide-react"

export type NavKey = "overview" | "transactions" | "budgets" | "pots" | "recurring-bills"

export interface NavItem {
  key: NavKey
  label: string
  icon: LucideIcon
  href: string
}

export interface SummaryStat {
  label: string
  amount: number
  variant: "primary" | "default"
}

export interface Pot {
  name: string
  amount: number
  target: number
  color: string
}

export interface Budget {
  category: TransactionCategory
  maximum: number
  spent: number
  color: string
}

export type TransactionCategory = 
  | "General"
  | "Dining Out"
  | "Groceries"
  | "Entertainment"
  | "Transportation"
  | "Shopping"
  | "Bills"
  | "Personal Care"
  | "Education"
  | "Lifestyle"

export interface Transaction {
  id: string
  name: string
  avatarUrl: string
  amount: number
  date: string
  category: TransactionCategory
}

export type SortOption = "latest" | "oldest" | "a-z" | "z-a" | "highest" | "lowest"

export interface RecurringBillSummary {
  label: string
  amount: number
  color: string
}
