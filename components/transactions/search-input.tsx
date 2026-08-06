"use client"

import { useEffect, useRef } from "react"

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
  const timeoutRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  function handleChange(nextValue: string) {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = window.setTimeout(() => onChange(nextValue), 300)
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Label
        htmlFor="search-txn"
        className="text-muted-foreground hidden text-xs font-bold md:block"
      >
        {label}
      </Label>
      <div className="relative">
        <Input
          id="search-txn"
          name="search-txn"
          aria-label={label}
          type="text"
          defaultValue={value}
          onChange={(event) => handleChange(event.target.value)}
          placeholder={placeholder}
        />
        <MagnifyingGlassIcon weight="light" aria-hidden />
      </div>
    </div>
  )
}
