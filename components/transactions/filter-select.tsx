"use client"

import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface FilterSelectProps<T extends string> {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  className?: string
}

export function FilterSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: FilterSelectProps<T>) {
  const selectedLabel = options.find((opt) => opt.value === value)?.label

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
          className="h-10 appearance-none rounded-lg border border-muted-foreground/20 bg-card py-2 pl-4 pr-10 text-sm font-bold text-card-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-card-foreground"
          aria-hidden
        />
      </div>
    </div>
  )
}
