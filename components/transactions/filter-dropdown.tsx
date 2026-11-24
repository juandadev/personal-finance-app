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
import { themeColorClasses, type ThemeColor } from "@/lib/theme-colors"

interface FilterDropdownProps<T extends string> {
  label: string
  value: T
  options: { value: T; label: string; color?: ThemeColor }[]
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
          {selectedOption?.color ? (
            <span
              aria-hidden
              className={cn(
                "border-border size-3 shrink-0 rounded-full border @[806px]/transactions:hidden",
                themeColorClasses[selectedOption.color].bg,
              )}
            />
          ) : null}
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
              <span className="flex items-center gap-2">
                {option.color ? (
                  <span
                    aria-hidden
                    className={cn(
                      "border-border size-3 shrink-0 rounded-full border",
                      themeColorClasses[option.color].bg,
                    )}
                  />
                ) : null}
                {option.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
