"use client"

import type { ReactNode, RefObject } from "react"

import { FormField } from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type SelectWithCreateOption = {
  value: string
  label: string
}

interface SelectWithCreateProps<TOption extends SelectWithCreateOption> {
  createItem?: { value: string; label: string; onSelect: () => void }
  disabled?: boolean
  error?: string
  id: string
  label: string
  onValueChange: (value: string) => void
  options: TOption[]
  placeholder?: string
  renderOption?: (option: TOption) => ReactNode
  triggerRef?: RefObject<HTMLButtonElement | null>
  value: string
}

export function SelectWithCreate<TOption extends SelectWithCreateOption>({
  createItem,
  disabled,
  error,
  id,
  label,
  onValueChange,
  options,
  placeholder = "Select an option",
  renderOption = (option) => option.label,
  triggerRef,
  value,
}: SelectWithCreateProps<TOption>) {
  const selectedOption = options.find((option) => option.value === value)

  const handleValueChange = (nextValue: string) => {
    // Radix's hidden native select can emit an empty value while new options
    // register. There is no empty option here, so it must not clear the form.
    if (!nextValue) {
      return
    }

    if (createItem && nextValue === createItem.value) {
      createItem.onSelect()
      return
    }

    onValueChange(nextValue)
  }

  return (
    <FormField id={id} label={label} error={error}>
      {(fieldProps) => (
        <Select
          value={value}
          onValueChange={handleValueChange}
          disabled={disabled}
        >
          <SelectTrigger {...fieldProps} ref={triggerRef} variant="form">
            <SelectValue placeholder={placeholder}>
              {selectedOption ? renderOption(selectedOption) : null}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-107.5" matchTriggerWidth>
            {options.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                variant="form"
              >
                {renderOption(option)}
              </SelectItem>
            ))}
            {createItem ? (
              <SelectItem value={createItem.value} variant="form">
                {createItem.label}
              </SelectItem>
            ) : null}
          </SelectContent>
        </Select>
      )}
    </FormField>
  )
}
