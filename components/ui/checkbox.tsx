"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { CheckIcon } from "@phosphor-icons/react"

import { cn } from "@/lib/utils"
import { getThemeColorCssVariable, type ThemeColor } from "@/lib/theme-colors"

function Checkbox({
  className,
  checkedThemeColor,
  style,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root> & {
  checkedThemeColor?: ThemeColor
}) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      style={{
        ...style,
        ...(checkedThemeColor
          ? {
              "--checkbox-checked": getThemeColorCssVariable(checkedThemeColor),
            }
          : null),
      }}
      className={cn(
        "peer border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive size-4 shrink-0 rounded-sm border shadow-xs transition-shadow outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        checkedThemeColor
          ? "data-[state=checked]:text-primary-foreground data-[state=checked]:border-(--checkbox-checked) data-[state=checked]:bg-(--checkbox-checked)"
          : "data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:border-primary dark:data-[state=checked]:bg-primary",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current transition-none"
      >
        <CheckIcon className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
