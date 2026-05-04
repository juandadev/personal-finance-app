"use client"

import { Search } from "lucide-react"
import { cn } from "@/lib/utils"

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
      <input
        id="search-txn"
        name="search-txn"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="border-muted-foreground/20 bg-card text-card-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary h-10 w-full rounded-sm border py-3 pr-8 pl-5 text-sm focus:ring-1 focus:outline-none"
      />
      <Search
        className="text-muted-foreground absolute top-1/2 right-3 size-4 -translate-y-1/2"
        aria-hidden
      />
    </div>
  )
}
