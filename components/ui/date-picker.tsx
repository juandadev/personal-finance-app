"use client"

import { CalendarIcon } from "@phosphor-icons/react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  formatDateToISODate,
  parseISODateToLocalDate,
} from "@/lib/finance/pot-due-date"
import { formatDisplayDate } from "@/lib/format"
import { cn } from "@/lib/utils"

interface DatePickerProps {
  id: string
  value: string | null
  onChange: (value: string | null) => void
  onBlur?: () => void
  min?: string
  max?: string
  disabled?: boolean
  placeholder?: string
  clearable?: boolean
  className?: string
  "aria-invalid"?: "true" | "false"
  "aria-describedby"?: string
}

export function DatePicker({
  id,
  value,
  onChange,
  onBlur,
  min,
  max,
  disabled = false,
  placeholder = "Select a date",
  clearable = false,
  className,
  "aria-invalid": ariaInvalid = "false",
  "aria-describedby": ariaDescribedBy,
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const selectedDate = parseISODateToLocalDate(value)

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)

    if (!nextOpen) {
      onBlur?.()
    }
  }

  return (
    <div className={cn("flex w-full min-w-0 flex-col gap-2", className)}>
      <Popover modal open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            id={id}
            variant="input"
            size="input"
            disabled={disabled}
            data-empty={!selectedDate}
            className="min-w-0 text-left"
            aria-invalid={ariaInvalid}
            aria-describedby={ariaDescribedBy}
          >
            <CalendarIcon weight="fill" aria-hidden />
            <span className="min-w-0 flex-1 truncate">
              {value && selectedDate ? formatDisplayDate(value) : placeholder}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto max-w-[calc(100vw-2rem)] overflow-hidden p-0"
          align="start"
          collisionPadding={16}
        >
          <Calendar
            mode="single"
            selected={selectedDate}
            defaultMonth={
              selectedDate ??
              parseISODateToLocalDate(max) ??
              parseISODateToLocalDate(min)
            }
            disabled={(date) => {
              const isoDate = formatDateToISODate(date)

              return Boolean((min && isoDate < min) || (max && isoDate > max))
            }}
            onSelect={(date) => {
              if (!date) {
                return
              }

              onChange(formatDateToISODate(date))
              setOpen(false)
              onBlur?.()
            }}
          />
        </PopoverContent>
      </Popover>

      {clearable && selectedDate && !disabled ? (
        <Button
          type="button"
          variant="link"
          className="text-muted-foreground h-auto p-0 text-xs"
          onClick={() => {
            onChange(null)
            onBlur?.()
          }}
        >
          Clear date
        </Button>
      ) : null}
    </div>
  )
}
