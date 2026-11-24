"use client"

import { DotsThreeIcon } from "@phosphor-icons/react"
import { motion, useMotionValue } from "motion/react"
import { useRef, useState, type PointerEvent } from "react"
import { createPortal } from "react-dom"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { potCardSizeSchema, type PotCardSize } from "@/lib/finance/pot-layout"
import { getPotResizePreview } from "./pot-resize-gesture"
import styles from "./pots-layout.module.css"

const sizeLabels: Record<PotCardSize, string> = {
  standard: "1 cell",
  wide: "2 columns",
  tall: "2 rows",
}

interface ResizeGesture {
  pointerId: number
  x: number
  y: number
  startSize: PotCardSize
  previewSize: PotCardSize
  moved: boolean
}

interface PotCardResizeProps {
  name: string
  size: PotCardSize
  preview: PotCardSize | undefined
  onPreview: (size: PotCardSize | undefined) => void
  onResize: (size: PotCardSize) => void
}

export function PotCardResize({
  name,
  size,
  preview,
  onPreview,
  onResize,
}: PotCardResizeProps) {
  const handleRef = useRef<HTMLButtonElement>(null)
  const gesture = useRef<ResizeGesture | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const cursorX = useMotionValue(0)
  const cursorY = useMotionValue(0)

  function trackCursor(event: PointerEvent<HTMLButtonElement>) {
    cursorX.set(Math.max(100, event.clientX))
    cursorY.set(Math.max(44, event.clientY))
  }

  function startResize(event: PointerEvent<HTMLButtonElement>) {
    if (menuOpen || event.button !== 0 || !event.isPrimary) return
    event.preventDefault()
    if (event.pointerType !== "mouse" || gesture.current) return

    const handle = event.currentTarget
    handle.focus({ preventScroll: true })
    handle.setPointerCapture(event.pointerId)
    gesture.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      startSize: size,
      previewSize: size,
      moved: false,
    }
    trackCursor(event)
    onPreview(size)
  }

  function readPointer(
    event: PointerEvent<HTMLButtonElement>,
    active: ResizeGesture,
  ) {
    const dx = event.clientX - active.x
    const dy = event.clientY - active.y
    active.moved ||= Math.hypot(dx, dy) >= 6
    return getPotResizePreview(active.startSize, active.previewSize, dx, dy)
  }

  function cancelResize(handle: HTMLButtonElement) {
    const active = gesture.current
    if (!active) return
    gesture.current = null
    if (handle.hasPointerCapture(active.pointerId)) {
      handle.releasePointerCapture(active.pointerId)
    }
    onPreview(undefined)
  }

  function moveResize(event: PointerEvent<HTMLButtonElement>) {
    const active = gesture.current
    if (!active || active.pointerId !== event.pointerId) return
    if (!event.currentTarget.getClientRects().length) {
      cancelResize(event.currentTarget)
      return
    }

    trackCursor(event)
    const nextSize = readPointer(event, active)
    if (nextSize !== active.previewSize) {
      active.previewSize = nextSize
      onPreview(nextSize)
    }
  }

  function finishResize(event: PointerEvent<HTMLButtonElement>) {
    const active = gesture.current
    if (!active || active.pointerId !== event.pointerId) return
    const nextSize = readPointer(event, active)
    cancelResize(event.currentTarget)
    if (!event.currentTarget.getClientRects().length) return

    if (!active.moved) {
      setMenuOpen(true)
    } else if (nextSize !== active.startSize) {
      onResize(nextSize)
    }
  }

  return (
    <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
      <DropdownMenuTrigger
        ref={handleRef}
        className={styles.resizeHandle}
        aria-label={`Resize ${name}`}
        title="Drag to resize or click for sizes"
        onPointerDown={startResize}
        onPointerMove={moveResize}
        onPointerUp={finishResize}
        onPointerCancel={(event) => cancelResize(event.currentTarget)}
        onLostPointerCapture={(event) => cancelResize(event.currentTarget)}
        onBlur={(event) => cancelResize(event.currentTarget)}
        onKeyDown={(event) => {
          if (!gesture.current) return
          if (event.key === "Escape") cancelResize(event.currentTarget)
          event.preventDefault()
        }}
      >
        <DotsThreeIcon
          className="size-5 -rotate-45"
          weight="bold"
          aria-hidden
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="motion-reduce:animate-none">
        <DropdownMenuRadioGroup value={size}>
          {potCardSizeSchema.options.map((option) => (
            <DropdownMenuRadioItem
              key={option}
              value={option}
              onSelect={() => {
                if (
                  option !== size &&
                  handleRef.current?.getClientRects().length
                ) {
                  onResize(option)
                }
              }}
            >
              {sizeLabels[option]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
      {preview &&
        createPortal(
          <motion.div
            aria-hidden
            className={styles.resizeFeedback}
            style={{ x: cursorX, y: cursorY }}
          >
            <span>{sizeLabels[preview]}</span>
          </motion.div>,
          document.body,
        )}
    </DropdownMenu>
  )
}
