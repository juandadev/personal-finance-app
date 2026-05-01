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
}

export interface Budget {
  category: TransactionCategory
  maximum: number
  spent: number
  color: ThemeColor
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

export type SortOption =
  | "latest"
  | "oldest"
  | "a-z"
  | "z-a"
  | "highest"
  | "lowest"

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
