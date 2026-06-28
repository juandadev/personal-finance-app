"use client"

import { useId, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
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
  const triggerId = useId()
  const selectedOption = options.find((option) => option.value === value)
  const selectedLabel = selectedOption?.label ?? value

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Label
        htmlFor={triggerId}
        className="text-muted-foreground hidden text-sm font-normal @[806px]/transactions:inline"
      >
        {label}
      </Label>
      <Select
        value={value}
        onValueChange={(nextValue) => onChange(nextValue as T)}
      >
        <SelectTrigger
          id={triggerId}
          aria-label={`${label}: ${selectedLabel}`}
          variant="filter"
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
