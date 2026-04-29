"use client"

import { useRef, useState, useEffect, type ReactNode } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

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
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const selectedLabel = options.find((opt) => opt.value === value)?.label

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
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
    <div
      className={cn("flex items-center gap-2", className)}
      ref={containerRef}
    >
      <span className="text-muted-foreground hidden text-sm md:inline">
        {label}
      </span>
      <div className="relative">
        {/* Mobile: Icon button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="border-muted-foreground/20 bg-card text-card-foreground hover:border-muted-foreground/40 focus:border-primary focus:ring-primary flex size-10 items-center justify-center rounded-lg border transition-colors focus:ring-1 focus:outline-none md:hidden"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-label={label}
        >
          {icon}
        </button>

        {/* Desktop: Full button with label */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="border-muted-foreground/20 bg-card text-card-foreground hover:border-muted-foreground/40 focus:border-primary focus:ring-primary hidden h-10 items-center gap-2 rounded-lg border px-4 text-sm font-bold transition-colors focus:ring-1 focus:outline-none md:flex"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          {selectedLabel}
          <ChevronDown
            className={cn(
              "size-4 transition-transform",
              isOpen && "rotate-180",
            )}
            aria-hidden
          />
        </button>

        {isOpen && (
          <ul
            role="listbox"
            className="bg-card absolute top-full right-0 z-50 mt-2 min-w-[140px] overflow-hidden rounded-lg shadow-lg"
          >
            {options.map((option, index) => (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  onClick={() => handleSelect(option.value)}
                  className={cn(
                    "hover:bg-muted/50 w-full px-5 py-3 text-left text-sm transition-colors",
                    option.value === value
                      ? "text-card-foreground font-bold"
                      : "text-muted-foreground",
                  )}
                >
                  {option.label}
                </button>
                {index < options.length - 1 && (
                  <div className="border-border mx-4 border-b" />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
