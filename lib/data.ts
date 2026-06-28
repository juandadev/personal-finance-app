import type { NavItem } from "./types"
import NavOverviewIcon from "@/components/icons/NavOverviewIcon"
import NavTransactionsIcon from "@/components/icons/NavTransactionsIcon"
import NavBudgetsIcon from "@/components/icons/NavBudgetsIcon"
import NavPotsIcon from "@/components/icons/NavPotsIcon"
import NavRecurringBillsIcon from "@/components/icons/NavRecurringBillsIcon"

export const navItems: NavItem[] = [
  { key: "overview", label: "Overview", icon: NavOverviewIcon, href: "/" },
  {
    key: "transactions",
    label: "Transactions",
    icon: NavTransactionsIcon,
    href: "/transactions",
  },
  { key: "budgets", label: "Budgets", icon: NavBudgetsIcon, href: "/budgets" },
  { key: "pots", label: "Pots", icon: NavPotsIcon, href: "/pots" },
  {
    key: "recurring-bills",
    label: "Recurring Bills",
    icon: NavRecurringBillsIcon,
    href: "/recurring-bills",
  },
]
