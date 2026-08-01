"use client"

import type { ComponentProps } from "react"
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts"
import { MoneyAmount } from "@/components/money-amount"
import { getThemeColorCssVariable } from "@/lib/theme-colors"
import type { Budget } from "@/lib/types"
import { useReducedMotion } from "motion/react"

type PieAnimationEasing = ComponentProps<typeof Pie>["animationEasing"]

const pieAnimationEasing = "cubic-bezier(0.42,1,0.22,1)" as PieAnimationEasing
const BUDGETS_CHART_ENTER_DURATION_MS = 1300

interface BudgetsChartProps {
  budgets: Budget[]
  spent: number
  limit: number
}

export function BudgetsChart({ budgets, spent, limit }: BudgetsChartProps) {
  const shouldReduceMotion = useReducedMotion()
  const hasBudgets = budgets.length > 0
  const data = hasBudgets
    ? budgets.map((b) => ({
        name: b.category,
        value: b.maximum,
        color: getThemeColorCssVariable(b.color),
      }))
    : [
        {
          name: "Empty",
          value: 1,
          color: "var(--color-muted)",
        },
      ]

  return (
    <div className="relative mx-auto aspect-square w-full max-w-61.75">
      <ResponsiveContainer
        width="100%"
        height="100%"
        className="before:bg-card relative isolate before:absolute before:inset-0 before:z-1 before:m-auto before:size-[75%] before:rounded-full before:opacity-25"
      >
        <PieChart className="z-0">
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="68%"
            outerRadius="100%"
            paddingAngle={0}
            stroke="none"
            startAngle={90}
            endAngle={-270}
            isAnimationActive={!shouldReduceMotion}
            animationDuration={BUDGETS_CHART_ENTER_DURATION_MS}
            animationEasing={pieAnimationEasing}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="text-foreground bg-card rounded-md px-1 text-3xl font-bold tracking-tight">
          <MoneyAmount amount={spent} />
        </p>
        <p className="text-muted-foreground mt-1 text-xs">
          {hasBudgets ? (
            <>
              of <MoneyAmount amount={limit} /> limit
            </>
          ) : (
            "No budgets yet"
          )}
        </p>
      </div>
    </div>
  )
}
