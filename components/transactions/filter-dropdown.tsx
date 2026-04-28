"use client"

import { useRef, useState, useEffect } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface FilterDropdownProps<T extends string> {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  className?: string
}

export function FilterDropdown<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: FilterDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const selectedLabel = options.find((opt) => opt.value === value)?.label

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSelect = (optionValue: T) => {
    onChange(optionValue)
    setIsOpen(false)
  }

  return (
    <div className={cn("flex items-center gap-2", className)} ref={containerRef}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex h-10 items-center gap-2 rounded-lg border border-muted-foreground/20 bg-card px-4 text-sm font-bold text-card-foreground transition-colors hover:border-muted-foreground/40 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          {selectedLabel}
          <ChevronDown
            className={cn("size-4 transition-transform", isOpen && "rotate-180")}
            aria-hidden
          />
        </button>

        {isOpen && (
          <ul
            role="listbox"
            className="absolute right-0 top-full z-50 mt-2 min-w-[140px] overflow-hidden rounded-lg bg-card shadow-lg"
          >
            {options.map((option, index) => (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  onClick={() => handleSelect(option.value)}
                  className={cn(
                    "w-full px-5 py-3 text-left text-sm transition-colors hover:bg-muted/50",
                    option.value === value
                      ? "font-bold text-card-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {option.label}
                </button>
                {index < options.length - 1 && (
                  <div className="mx-4 border-b border-border" />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
