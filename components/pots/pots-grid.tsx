"use client"

import { motion, MotionConfig } from "motion/react"
import { useMemo, useRef, useState, useSyncExternalStore } from "react"
import { createPortal } from "react-dom"

import { TooltipProvider } from "@/components/ui/tooltip"
import { useFinance } from "@/hooks/use-finance"
import {
  applyPotLayoutChange,
  getOrderedPotLayout,
  type PotCardSize,
  type PotLayoutMove,
} from "@/lib/finance/pot-layout"
import { PotCard } from "./pot-card"
import { PotCardMove } from "./pot-card-move"
import { PotCardResize } from "./pot-card-resize"
import styles from "./pots-layout.module.css"
import { usePotReorder } from "./use-pot-reorder"

const layoutSpring = { type: "spring" as const, stiffness: 410, damping: 39 }
const layoutTransition = { layout: layoutSpring }
const reducedMotionQuery = "(prefers-reduced-motion: reduce)"

function subscribeToReducedMotion(onChange: () => void) {
  const query = window.matchMedia(reducedMotionQuery)
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

export function PotsGrid() {
  const { pots, state, pendingPotLayoutChanges, actions } = useFinance()
  const savedLayout = state.preferences.potLayout
  const reduceMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    () => window.matchMedia(reducedMotionQuery).matches,
    () => true,
  )
  const [preview, setPreview] = useState<{ potId: string; size: PotCardSize }>()
  const potsById = useMemo(
    () =>
      new Map(
        pots.map((pot) => [
          pot.id,
          {
            pot,
            percentage:
              (Math.round(pot.amount * 100) / Math.round(pot.target * 100)) *
              100,
          },
        ]),
      ),
    [pots],
  )
  const layout = useMemo(
    () =>
      pendingPotLayoutChanges.reduce(
        applyPotLayoutChange,
        getOrderedPotLayout([...potsById.keys()], savedLayout),
      ),
    [pendingPotLayoutChanges, potsById, savedLayout],
  )
  const movePot = (move: PotLayoutMove) => void actions.changePotLayout(move)
  const gridRef = useRef<HTMLDivElement>(null)
  const reorder = usePotReorder(
    gridRef,
    layout,
    movePot,
    reduceMotion,
    layoutSpring,
  )
  const drag = reorder.preview
  const draggedCard = drag && potsById.get(drag.potId)
  const visibleLayout = drag?.layout ?? layout
  const draggedHighlight =
    drag && visibleLayout.find(({ potId }) => potId === drag.potId)?.highlighted

  return (
    <TooltipProvider delayDuration={300} skipDelayDuration={300}>
      <MotionConfig transition={layoutTransition}>
        <div
          ref={gridRef}
          className={styles.grid}
          data-dragging={drag?.layout ? "" : undefined}
          onPointerMove={reorder.onPointerMove}
          onPointerUp={reorder.onPointerUp}
          onPointerCancel={reorder.onPointerCancel}
          onLostPointerCapture={reorder.onPointerCancel}
        >
          {visibleLayout.map(({ potId, size, highlighted = false }, index) => {
            const card = potsById.get(potId)
            if (!card) return null

            const { pot, percentage } = card
            const previewSize =
              preview?.potId === potId ? preview.size : undefined
            const isDragging = drag?.potId === potId

            return (
              <motion.div
                key={potId}
                layout={!reduceMotion && !isDragging}
                className={styles.item}
                data-pot-id={potId}
                data-size={previewSize ?? size}
                data-highlighted={highlighted ? "" : undefined}
                data-resizing={previewSize ? "" : undefined}
                data-reordering={isDragging ? "" : undefined}
              >
                <PotCard
                  pot={pot}
                  percentage={percentage}
                  animateLayout={!reduceMotion && !isDragging}
                  highlighted={highlighted}
                  onToggleHighlight={() =>
                    void actions.changePotLayout({
                      type: "highlight",
                      potId,
                      highlighted: !highlighted,
                    })
                  }
                />
                {visibleLayout.length > 1 && (
                  <PotCardMove
                    name={pot.name}
                    layout={visibleLayout}
                    index={index}
                    onStart={reorder.start}
                    onMove={movePot}
                  />
                )}
                <PotCardResize
                  name={pot.name}
                  size={size}
                  preview={previewSize}
                  onPreview={(size) =>
                    setPreview(size === undefined ? undefined : { potId, size })
                  }
                  onResize={(size) =>
                    void actions.changePotLayout({
                      type: "resize",
                      potId,
                      size,
                    })
                  }
                />
              </motion.div>
            )
          })}
        </div>
        {drag &&
          draggedCard &&
          createPortal(
            <motion.div
              inert
              aria-hidden
              className={styles.draggedCard}
              data-highlighted={draggedHighlight ? "" : undefined}
              style={{
                x: reorder.x,
                y: reorder.y,
                width: drag.width,
                height: drag.height,
              }}
            >
              <PotCard
                {...draggedCard}
                animateLayout={false}
                highlighted={draggedHighlight ?? false}
              />
            </motion.div>,
            document.body,
          )}
      </MotionConfig>
    </TooltipProvider>
  )
}
