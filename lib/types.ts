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
  isVoucherExpense: boolean
  paymentMethod:
    "bank_account" | "credit_card" | "voucher" | "credit_card_payment"
  creditCardId?: string
  creditCardStatementId?: string
  paymentMethodLabel: string
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

export type CreditCardDueStatus =
  "upcoming" | "due-soon" | "due-today" | "overdue" | "paid"

export interface CreditCardSummary {
  label: string
  amount: number
  count: number
  color: ThemeColor
}

export interface CreditCardStatement {
  id: string
  creditCardId: string
  periodStart: string
  periodEnd: string
  paymentDueDate: string
  amount: number
  lifecycleStatus: "open" | "closed" | "paid"
  dueStatus: CreditCardDueStatus
  paidAt?: string
}

export interface CreditCardPayment {
  id: string
  creditCardId: string
  statementId: string
  sourceAccountId: string
  cashflowTransactionId: string
  amount: number
  paidAt: string
}

export interface CreditCard {
  id: string
  nickname: string
  issuer: string
  network: string
  lastFour: string
  expirationMonth: number
  expirationYear: number
  creditLimit: number
  closingDay: number
  paymentDueDay: number
  color: ThemeColor
  initials: string
  archivedAt?: string
  currentStatement?: CreditCardStatement
  statements: CreditCardStatement[]
  payments: CreditCardPayment[]
  currentStatementAmount: number
  availableCredit: number
  dueStatus: CreditCardDueStatus
}
