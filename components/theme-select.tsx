"use client"

import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { themeOptions } from "@/lib/finance/form-utils"
import { themeColorClasses, type ThemeColor } from "@/lib/theme-colors"
import { cn } from "@/lib/utils"

interface ThemeSelectProps {
  id: string
  value: ThemeColor
  onValueChange: (value: ThemeColor) => void
  usedThemeColors?: ReadonlySet<string>
}

const emptyUsedThemeColors = new Set<string>()

export function ThemeSelect({
  id,
  value,
  onValueChange,
  usedThemeColors = emptyUsedThemeColors,
}: ThemeSelectProps) {
  const selectedTheme = themeOptions.find((theme) => theme.value === value)

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-muted-foreground text-xs font-bold">
        Theme
      </Label>
      <Select
        value={value}
        onValueChange={(nextValue) => onValueChange(nextValue as ThemeColor)}
      >
        <SelectTrigger id={id} variant="form">
          <SelectValue>
            <span className="flex items-center gap-3">
              <span
                aria-hidden
                className={cn(
                  "size-4 rounded-full",
                  selectedTheme && themeColorClasses[selectedTheme.value].bg,
                )}
              />
              {selectedTheme?.label}
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-107.5" matchTriggerWidth>
          {themeOptions.map((theme) => {
            const isAlreadyUsed = usedThemeColors.has(theme.value.toLowerCase())

            return (
              <SelectItem
                key={theme.value}
                value={theme.value}
                variant="form"
                className="focus:**:data-theme-color-dot:border-card focus:**:data-theme-used:text-white"
              >
                <span className="flex w-full min-w-0 items-center justify-between gap-3">
                  <span
                    className={cn(
                      "relative isolate flex min-w-0 items-center gap-3",
                      isAlreadyUsed && "opacity-35",
                    )}
                  >
                    <span
                      data-theme-color-dot
                      aria-hidden
                      className={cn(
                        "size-4 rounded-full border-2",
                        themeColorClasses[theme.value].bg,
                        themeColorClasses[theme.value].border,
                      )}
                    />
                    {theme.label}
                  </span>
                  {isAlreadyUsed && (
                    <span
                      data-theme-used
                      className="text-muted-foreground shrink-0 text-xs"
                    >
                      Already used
                    </span>
                  )}
                </span>
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
    </div>
  )
}
