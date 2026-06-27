"use client"

import * as React from "react"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { cn } from "@/lib/utils"

function CurrencyInput({
  className,
  ...props
}: React.ComponentProps<typeof InputGroupInput>) {
  return (
    <InputGroup className="h-11 rounded-lg shadow-none">
      <InputGroupAddon className="pl-5 font-normal">$</InputGroupAddon>
      <InputGroupInput className={cn("h-full text-sm", className)} {...props} />
    </InputGroup>
  )
}

export { CurrencyInput }
