"use client"

import type { ReactNode } from "react"
import { DotsThreeIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface OverflowActionsProps {
  ariaLabel: string
  children: ReactNode
}

function OverflowActions({ ariaLabel, children }: OverflowActionsProps) {
  return (
    <DropdownMenu>
      <TooltipProvider skipDelayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-lg" aria-label={ariaLabel}>
                <DotsThreeIcon weight="bold" className="size-4" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>More actions</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenuContent align="end" sideOffset={8}>
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface ModuleHeaderActionsProps extends OverflowActionsProps {
  primaryAction?: ReactNode
}

export function ModuleHeaderActions({
  primaryAction,
  ariaLabel,
  children,
}: ModuleHeaderActionsProps) {
  return (
    <div className="flex shrink-0 items-center gap-3">
      {primaryAction}
      {children ? (
        <OverflowActions ariaLabel={ariaLabel}>{children}</OverflowActions>
      ) : null}
    </div>
  )
}

export function ItemActions({ ariaLabel, children }: OverflowActionsProps) {
  return <OverflowActions ariaLabel={ariaLabel}>{children}</OverflowActions>
}
