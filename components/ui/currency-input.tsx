"use client"

import * as React from "react"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { cn } from "@/lib/utils"

function sanitizeCurrencyValue(value: string) {
  const numericValue = value.replace(/[^\d.]/g, "")
  const [integerPart, ...decimalParts] = numericValue.split(".")

  if (decimalParts.length === 0) {
    return integerPart
  }

  return `${integerPart}.${decimalParts.join("")}`
}

function getNextValue(input: HTMLInputElement, insertedValue: string) {
  const selectionStart = input.selectionStart ?? input.value.length
  const selectionEnd = input.selectionEnd ?? selectionStart

  return `${input.value.slice(0, selectionStart)}${insertedValue}${input.value.slice(selectionEnd)}`
}

function CurrencyInput({
  className,
  inputMode = "decimal",
  onBeforeInput,
  onChange,
  ...props
}: React.ComponentProps<typeof InputGroupInput>) {
  return (
    <InputGroup className="h-11 rounded-lg shadow-none">
      <InputGroupAddon className="text-finance-beige-500 pl-5 font-normal">
        $
      </InputGroupAddon>
      <InputGroupInput
        className={cn("h-full text-sm", className)}
        inputMode={inputMode}
        onBeforeInput={(event) => {
          onBeforeInput?.(event)

          if (event.defaultPrevented) {
            return
          }

          const inputEvent = event.nativeEvent as InputEvent
          const insertedValue = inputEvent.data ?? ""

          if (!insertedValue) {
            return
          }

          const nextValue = getNextValue(event.currentTarget, insertedValue)

          if (sanitizeCurrencyValue(nextValue) !== nextValue) {
            event.preventDefault()
          }
        }}
        onChange={(event) => {
          const sanitizedValue = sanitizeCurrencyValue(
            event.currentTarget.value,
          )

          if (sanitizedValue !== event.currentTarget.value) {
            event.currentTarget.value = sanitizedValue
          }

          onChange?.(event)
        }}
        pattern="[0-9]*[.]?[0-9]*"
        {...props}
      />
    </InputGroup>
  )
}

export { CurrencyInput }
