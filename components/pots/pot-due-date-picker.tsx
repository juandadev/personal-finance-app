"use client"

import { addDays, startOfDay } from "date-fns"

import { DatePicker } from "@/components/ui/date-picker"
import { formatDateToISODate } from "@/lib/finance/pot-due-date"

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
  return (
    <DatePicker
      id={id}
      value={value}
      onChange={onChange}
      min={formatDateToISODate(addDays(startOfDay(new Date()), 1))}
      placeholder="Select a due date"
      clearable
      aria-invalid={hasError ? "true" : "false"}
      aria-describedby={describedBy}
    />
  )
}
