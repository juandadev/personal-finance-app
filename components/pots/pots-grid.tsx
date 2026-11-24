"use client"

import { motion, MotionConfig } from "motion/react"
import { useMemo, useState, useSyncExternalStore } from "react"

import { TooltipProvider } from "@/components/ui/tooltip"
import { useFinance } from "@/hooks/use-finance"
import { getOrderedPotLayout, type PotCardSize } from "@/lib/finance/pot-layout"
import { PotCard } from "./pot-card"
import { PotCardResize } from "./pot-card-resize"
import styles from "./pots-layout.module.css"

const layoutTransition = {
  layout: { type: "spring" as const, stiffness: 410, damping: 39 },
}
const reducedMotionQuery = "(prefers-reduced-motion: reduce)"

function subscribeToReducedMotion(onChange: () => void) {
  const query = window.matchMedia(reducedMotionQuery)
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

export function PotsGrid() {
  const { pots, state, pendingPotResizes, actions } = useFinance()
  const savedLayout = state.preferences.potLayout
  const reduceMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    () => window.matchMedia(reducedMotionQuery).matches,
    () => true,
  )
  const [preview, setPreview] = useState<{ potId: string; size: PotCardSize }>()
  const potsById = useMemo(
    () => new Map(pots.map((pot) => [pot.id, pot])),
    [pots],
  )
  const layout = useMemo(
    () => getOrderedPotLayout([...potsById.keys()], savedLayout),
    [potsById, savedLayout],
  )

  return (
    <TooltipProvider delayDuration={300} skipDelayDuration={300}>
      <MotionConfig transition={layoutTransition}>
        <div className={styles.grid}>
          {layout.map(({ potId, size: savedSize }) => {
            const pot = potsById.get(potId)
            if (!pot) return null

            const size = pendingPotResizes.get(potId)?.size ?? savedSize
            const previewSize =
              preview?.potId === potId ? preview.size : undefined
            const percentage =
              (Math.round(pot.amount * 100) / Math.round(pot.target * 100)) *
              100

            return (
              <motion.div
                key={potId}
                layout={!reduceMotion}
                className={styles.item}
                data-size={previewSize ?? size}
                data-resizing={previewSize ? "" : undefined}
              >
                <PotCard
                  pot={pot}
                  percentage={percentage}
                  animateLayout={!reduceMotion}
                />
                <PotCardResize
                  name={pot.name}
                  size={size}
                  preview={previewSize}
                  onPreview={(size) =>
                    setPreview(size === undefined ? undefined : { potId, size })
                  }
                  onResize={(size) => void actions.resizePotCard(potId, size)}
                />
              </motion.div>
            )
          })}
        </div>
      </MotionConfig>
    </TooltipProvider>
  )
}
