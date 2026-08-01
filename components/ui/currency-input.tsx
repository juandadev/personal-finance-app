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

function removeGroupingSeparators(value: string) {
  return value.replace(/,/g, "")
}

function formatCurrencyValue(value: string) {
  const sanitizedValue = sanitizeCurrencyValue(value)
  const hasDecimal = sanitizedValue.includes(".")
  const [integerPart, decimalPart = ""] = sanitizedValue.split(".")
  const formattedIntegerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",")

  if (!hasDecimal) {
    return formattedIntegerPart
  }

  return `${formattedIntegerPart}.${decimalPart}`
}

function getNextValue(input: HTMLInputElement, insertedValue: string) {
  const selectionStart = input.selectionStart ?? input.value.length
  const selectionEnd = input.selectionEnd ?? selectionStart

  return `${input.value.slice(0, selectionStart)}${insertedValue}${input.value.slice(selectionEnd)}`
}

function getSanitizedSelectionIndex(value: string, selectionStart: number) {
  return sanitizeCurrencyValue(value.slice(0, selectionStart)).length
}

function getFormattedSelectionIndex(
  value: string,
  sanitizedSelectionIndex: number,
) {
  if (sanitizedSelectionIndex === 0) {
    return 0
  }

  let sanitizedCharactersSeen = 0

  for (let index = 0; index < value.length; index += 1) {
    if (value[index] !== ",") {
      sanitizedCharactersSeen += 1
    }

    if (sanitizedCharactersSeen === sanitizedSelectionIndex) {
      return index + 1
    }
  }

  return value.length
}

function setRef<T>(ref: React.Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") {
    ref(value)
    return
  }

  if (ref) {
    ref.current = value
  }
}

function CurrencyInput({
  className,
  inputMode = "decimal",
  onBeforeInput,
  onChange,
  ref,
  value,
  defaultValue,
  ...props
}: React.ComponentProps<typeof InputGroupInput>) {
  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const pendingSelectionIndexRef = React.useRef<number | null>(null)

  const formattedValue =
    value === undefined ? undefined : formatCurrencyValue(String(value))
  const formattedDefaultValue =
    defaultValue === undefined
      ? undefined
      : formatCurrencyValue(String(defaultValue))

  React.useLayoutEffect(() => {
    const pendingSelectionIndex = pendingSelectionIndexRef.current
    const input = inputRef.current

    if (pendingSelectionIndex === null) {
      return
    }

    pendingSelectionIndexRef.current = null

    if (!input || input !== document.activeElement) {
      return
    }

    input.setSelectionRange(pendingSelectionIndex, pendingSelectionIndex)
  })

  return (
    <InputGroup className="h-11 rounded-lg shadow-none">
      <InputGroupAddon className="text-finance-beige-500 pl-5 font-normal">
        $
      </InputGroupAddon>
      <InputGroupInput
        className={cn("h-full text-sm tabular-nums", className)}
        ref={(node) => {
          inputRef.current = node
          setRef(ref, node)
        }}
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

          if (
            sanitizeCurrencyValue(nextValue) !==
            removeGroupingSeparators(nextValue)
          ) {
            event.preventDefault()
          }
        }}
        onChange={(event) => {
          const selectionStart =
            event.currentTarget.selectionStart ??
            event.currentTarget.value.length
          const sanitizedSelectionIndex = getSanitizedSelectionIndex(
            event.currentTarget.value,
            selectionStart,
          )
          const sanitizedValue = sanitizeCurrencyValue(
            event.currentTarget.value,
          )
          const nextFormattedValue = formatCurrencyValue(sanitizedValue)
          const nextSelectionIndex = getFormattedSelectionIndex(
            nextFormattedValue,
            sanitizedSelectionIndex,
          )

          pendingSelectionIndexRef.current = nextSelectionIndex
          event.currentTarget.value = sanitizedValue
          onChange?.(event)
          event.currentTarget.value = nextFormattedValue

          if (event.currentTarget === document.activeElement) {
            event.currentTarget.setSelectionRange(
              nextSelectionIndex,
              nextSelectionIndex,
            )
          }
        }}
        pattern="[0-9,]*[.]?[0-9]*"
        value={formattedValue}
        defaultValue={formattedDefaultValue}
        {...props}
      />
    </InputGroup>
  )
}

export { CurrencyInput }
