"use client"

import { useSyncExternalStore } from "react"
import { EyeIcon, EyeSlashIcon } from "@phosphor-icons/react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { useHotkeys } from "react-hotkeys-hook"

import { Kbd } from "@/components/ui/kbd"
import { Toggle } from "@/components/ui/toggle"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useFinance } from "@/hooks/use-finance"
import { getModShiftPeriodShortcutLabel } from "@/lib/platform"

const subscribePlatform = () => () => undefined
const getServerShortcutLabel = () => "Ctrl+⇧+."

export function GlobalMenu() {
  const {
    state: {
      preferences: { hideAmounts },
    },
    actions,
  } = useFinance()
  const shouldReduceMotion = useReducedMotion()
  const shortcutLabel = useSyncExternalStore(
    subscribePlatform,
    getModShiftPeriodShortcutLabel,
    getServerShortcutLabel,
  )

  const togglePrivacy = () => {
    void actions.updateUiPreferences(!hideAmounts)
  }

  useHotkeys(
    "meta+shift+period, ctrl+shift+period",
    (event) => {
      event.preventDefault()
      togglePrivacy()
    },
    {
      enableOnFormTags: true,
      enableOnContentEditable: true,
      preventDefault: true,
    },
    [hideAmounts, actions],
  )

  const label = hideAmounts ? "Show amounts" : "Hide amounts"

  return (
    <div className="pointer-events-none fixed right-2 bottom-16 z-40 flex flex-col items-end gap-2 lg:right-4 lg:bottom-4">
      <TooltipProvider skipDelayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              pressed={hideAmounts}
              onPressedChange={(pressed) => {
                void actions.updateUiPreferences(pressed)
              }}
              aria-label={label}
              variant="outline"
              size="lg"
              className="border-border bg-card text-foreground hover:bg-muted hover:text-foreground data-[state=on]:bg-card data-[state=on]:text-foreground pointer-events-auto size-11 rounded-full shadow-sm"
            >
              <AnimatePresence initial={false} mode="popLayout">
                <motion.span
                  key={hideAmounts ? "hidden" : "visible"}
                  className="flex items-center justify-center"
                  initial={
                    shouldReduceMotion
                      ? false
                      : { opacity: 0, filter: "blur(2px)" }
                  }
                  animate={
                    shouldReduceMotion
                      ? { opacity: 1 }
                      : { opacity: 1, filter: "blur(0px)" }
                  }
                  exit={
                    shouldReduceMotion
                      ? { opacity: 0 }
                      : { opacity: 0, filter: "blur(2px)" }
                  }
                  transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
                >
                  {hideAmounts ? (
                    <EyeSlashIcon
                      weight="fill"
                      className="size-5"
                      aria-hidden
                    />
                  ) : (
                    <EyeIcon weight="fill" className="size-5" aria-hidden />
                  )}
                </motion.span>
              </AnimatePresence>
            </Toggle>
          </TooltipTrigger>
          <TooltipContent side="left" className="flex items-center gap-2">
            <span>{label}</span>
            <Kbd>{shortcutLabel}</Kbd>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}
