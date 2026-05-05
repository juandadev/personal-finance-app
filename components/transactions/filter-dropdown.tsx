"use client"

import { type ReactNode } from "react"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface FilterDropdownProps<T extends string> {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  icon?: ReactNode
  className?: string
}

export function FilterDropdown<T extends string>({
  label,
  value,
  options,
  onChange,
  icon,
  className,
}: FilterDropdownProps<T>) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-muted-foreground hidden text-sm @[806px]/transactions:inline">
        {label}
      </span>
      <Select
        value={value}
        onValueChange={(nextValue) => onChange(nextValue as T)}
      >
        <SelectTrigger
          aria-label={label}
          className={cn(
            "[&>svg:last-child]:hidden @[806px]/transactions:[&>svg:last-child]:block",
            "@[806px]/transactions:border-input border-transparent @[806px]/transactions:w-fit @[806px]/transactions:px-5 @[806px]/transactions:py-3",
          )}
        >
          {icon && (
            <span
              aria-hidden
              className="flex items-center justify-center @[806px]/transactions:hidden"
            >
              {icon}
            </span>
          )}
          <span className="hidden @[806px]/transactions:inline-flex">
            <SelectValue />
          </span>
        </SelectTrigger>
        <SelectContent align="end">
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className={cn(option.value === value && "font-bold")}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
