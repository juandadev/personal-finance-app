"use client"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import SearchIcon from "@/components/icons/SearchIcon"

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search transaction",
  className,
}: SearchInputProps) {
  return (
    <div className={cn("relative", className)}>
      <Input
        id="search-txn"
        name="search-txn"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      <SearchIcon aria-hidden />
    </div>
  )
}
