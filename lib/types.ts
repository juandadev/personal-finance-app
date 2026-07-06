import type { ComponentType } from "react"
import type { LucideIcon } from "lucide-react"
import type { ThemeColor } from "@/lib/theme-colors"
import type { IconProps } from "@/types"

export type NavIcon = LucideIcon | ComponentType<IconProps>

export interface NavItem {
  key: string
  label: string
  icon: NavIcon
  href: string
}

export interface SummaryStat {
  label: string
  amount: number
  variant: "primary" | "default"
}

export interface Pot {
  id: string
  name: string
  amount: number
  target: number
  color: ThemeColor
  dueDate?: string
}

export interface Budget {
  id: string
  period: string
  category: TransactionCategory
  categoryId: string
  maximum: number
  spent: number
  color: ThemeColor
}

export type TransactionCategory = string

export interface Transaction {
  id: string
  name: string
  avatarUrl: string
  contactColor: ThemeColor
  contactInitials: string
  amount: number
  accountId: string
  counterpartyId: string
  categoryId: string
  concept: string
  date: string
  postedAt: string
  category: TransactionCategory
  description?: string
  budgetId?: string
  budgetCategory?: TransactionCategory
}

export type SortOption =
  "latest" | "oldest" | "a-z" | "z-a" | "highest" | "lowest"

export interface RecurringBillSummary {
  label: string
  amount: number
  color: ThemeColor
}

export type BillStatus = "paid" | "upcoming" | "due-soon"

export interface RecurringBill {
  id: string
  name: string
  avatarUrl: string
  amount: number
  dueDay: number
  status: BillStatus
}
