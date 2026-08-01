"use client"

import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface ResetUrlFiltersButtonProps {
  className?: string
  onReset: () => void
}

export function ResetUrlFiltersButton({
  className,
  onReset,
}: ResetUrlFiltersButtonProps) {
  return (
    <TooltipProvider skipDelayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            className={cn("size-11", className)}
            aria-label="Reset filters and sorting"
            onClick={onReset}
          >
            <ArrowCounterClockwiseIcon
              weight="fill"
              className="size-4"
              aria-hidden
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Reset filters and sorting</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
