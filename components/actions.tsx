"use client"

import type { ComponentProps, ReactNode } from "react"
import { DotsThreeIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  disabled?: boolean
}

function OverflowActions({
  ariaLabel,
  children,
  disabled = false,
}: OverflowActionsProps) {
  return (
    <DropdownMenu>
      <TooltipProvider skipDelayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild disabled={disabled}>
              <Button
                variant="ghost"
                size="icon-lg"
                aria-label={ariaLabel}
                disabled={disabled}
              >
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
  primaryMenuItem?: ReactNode
}

export function ModuleHeaderActions({
  primaryAction,
  primaryMenuItem,
  ariaLabel,
  children,
}: ModuleHeaderActionsProps) {
  const collapsePrimaryOnMobile = Boolean(primaryAction && children)

  return (
    <div className="flex shrink-0 items-center gap-3">
      {primaryAction ? (
        <div
          className={collapsePrimaryOnMobile ? "hidden md:block" : undefined}
        >
          {primaryAction}
        </div>
      ) : null}
      {children ? (
        <OverflowActions ariaLabel={ariaLabel}>
          {collapsePrimaryOnMobile ? (
            <div className="contents md:hidden">
              {primaryMenuItem ?? primaryAction}
            </div>
          ) : null}
          {children}
        </OverflowActions>
      ) : null}
    </div>
  )
}

export function HeaderMenuItem(props: ComponentProps<typeof DropdownMenuItem>) {
  return <DropdownMenuItem {...props} />
}

export function ItemActions({
  ariaLabel,
  children,
  disabled,
}: OverflowActionsProps) {
  return (
    <OverflowActions ariaLabel={ariaLabel} disabled={disabled}>
      {children}
    </OverflowActions>
  )
}
