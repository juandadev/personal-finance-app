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
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="border-muted-foreground/20 bg-card text-card-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary h-10 w-full rounded-lg border pr-10 pl-4 text-sm focus:ring-1 focus:outline-none md:w-80"
      />
      <Search
        className="text-muted-foreground absolute top-1/2 right-3 size-4 -translate-y-1/2"
        aria-hidden
      />
    </div>
  )
}
