"use client"

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts"
import { formatCurrency } from "@/lib/format"
import type { Budget } from "@/lib/types"

interface BudgetsChartProps {
  budgets: Budget[]
  spent: number
  limit: number
}

export function BudgetsChart({ budgets, spent, limit }: BudgetsChartProps) {
  const data = budgets.map((b) => ({ name: b.category, value: b.amount, color: b.color }))

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
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
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="text-3xl font-bold tracking-tight text-foreground">
          {formatCurrency(spent)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">of {formatCurrency(limit)} limit</p>
      </div>
    </div>
  )
}
