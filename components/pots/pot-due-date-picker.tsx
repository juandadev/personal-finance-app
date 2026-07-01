"use client"

import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
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
  isFutureISODate,
  parseISODateToLocalDate,
} from "@/lib/finance/pot-due-date"

interface PotDueDatePickerProps {
  id: string
  value: string | null
  onChange: (value: string | null) => void
  hasError?: boolean
  describedBy?: string
}

export function PotDueDatePicker({
  id,
  value,
  onChange,
  hasError = false,
  describedBy,
}: PotDueDatePickerProps) {
  const [open, setOpen] = useState(false)
  const selectedDate = parseISODateToLocalDate(value)

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            id={id}
            variant="input"
            size="input"
            data-empty={!selectedDate}
            className="text-left"
            aria-invalid={hasError ? "true" : "false"}
            aria-describedby={describedBy}
          >
            <CalendarIcon className="size-4" aria-hidden />
            {selectedDate ? format(selectedDate, "PPP") : "Select a due date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            defaultMonth={selectedDate}
            disabled={(date) => !isFutureISODate(formatDateToISODate(date))}
            onSelect={(date) => {
              if (!date) {
                return
              }

              onChange(formatDateToISODate(date))
              setOpen(false)
            }}
          />
        </PopoverContent>
      </Popover>

      {selectedDate ? (
        <Button
          type="button"
          variant="link"
          className="text-muted-foreground h-auto p-0 text-xs"
          onClick={() => onChange(null)}
        >
          Clear date
        </Button>
      ) : null}
    </div>
  )
}
