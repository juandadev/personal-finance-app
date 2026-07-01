"use client"

import { useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { formatCompactCurrency, formatCurrency } from "@/lib/format"
import { cn } from "@/lib/utils"

interface PotMoneyRevealProps {
  amount: number
  className?: string
  expandedClassName?: string
}

export function PotMoneyReveal({
  amount,
  className,
  expandedClassName,
}: PotMoneyRevealProps) {
  const [isRevealed, setIsRevealed] = useState(false)
  const shouldReduceMotion = useReducedMotion()
  const fullAmount = formatCurrency(amount)
  const shouldCompact = Math.abs(amount) >= 100000
  const compactAmount = shouldCompact
    ? formatCompactCurrency(amount)
    : fullAmount

  if (!shouldCompact) {
    return <span className={className}>{fullAmount}</span>
  }

  return (
    <span
      className={cn(
        "focus-visible:ring-ring/50 relative inline-grid max-w-full rounded-md outline-none focus-visible:ring-[3px]",
        className,
      )}
      aria-label={fullAmount}
      onBlur={() => setIsRevealed(false)}
      onFocus={() => setIsRevealed(true)}
      onPointerEnter={() => setIsRevealed(true)}
      onPointerLeave={() => setIsRevealed(false)}
      tabIndex={0}
    >
      <span aria-hidden className="invisible col-start-1 row-start-1">
        {compactAmount}
      </span>
      <AnimatePresence initial={false} mode="popLayout">
        {isRevealed ? (
          <motion.span
            key="full"
            aria-hidden
            className={cn(
              "bg-card text-foreground absolute top-0 left-0 z-20 whitespace-nowrap",
              expandedClassName,
            )}
            initial={
              shouldReduceMotion ? false : { opacity: 0, filter: "blur(2px)" }
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
            {fullAmount}
          </motion.span>
        ) : (
          <motion.span
            key="compact"
            aria-hidden
            className="col-start-1 row-start-1 whitespace-nowrap"
            initial={
              shouldReduceMotion ? false : { opacity: 0, filter: "blur(2px)" }
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
            {compactAmount}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}
