import { Home, ArrowDownUp, ChartPie, PiggyBank, ReceiptText } from "lucide-react"
import type { NavItem } from "./types"

export const navItems: NavItem[] = [
  { key: "overview", label: "Overview", icon: Home, href: "/" },
  { key: "transactions", label: "Transactions", icon: ArrowDownUp, href: "/transactions" },
  { key: "budgets", label: "Budgets", icon: ChartPie, href: "/budgets" },
  { key: "pots", label: "Pots", icon: PiggyBank, href: "/pots" },
  { key: "recurring-bills", label: "Recurring Bills", icon: ReceiptText, href: "/recurring-bills" },
]
