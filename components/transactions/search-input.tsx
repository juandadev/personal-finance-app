"use client"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MagnifyingGlassIcon } from "@phosphor-icons/react"

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  label?: string
  placeholder?: string
  className?: string
}

export function SearchInput({
  value,
  onChange,
  label = "Search Transactions",
  placeholder = "Search transaction",
  className,
}: SearchInputProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label
        htmlFor="search-txn"
        className="text-muted-foreground text-xs font-bold"
      >
        {label}
      </Label>
      <div className="relative">
        <Input
          id="search-txn"
          name="search-txn"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
        <MagnifyingGlassIcon weight="light" aria-hidden />
      </div>
    </div>
  )
}
