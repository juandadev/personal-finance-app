"use client"

import { animate, useMotionValue, type Transition } from "motion/react"
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
  type RefObject,
} from "react"

import {
  applyPotLayoutChange,
  type PotLayout,
  type PotLayoutMove,
} from "@/lib/finance/pot-layout"
import {
  getClosestPotSlot,
  getPotDragScrollSpeed,
} from "./pot-reorder-geometry"

interface Point {
  x: number
  y: number
}

interface DragPreview {
  potId: string
  layout: PotLayout | null
  width: number
  height: number
}

interface DragSession {
  potId: string
  grid: HTMLDivElement
  grip: HTMLButtonElement
  pointerId: number
  origin: Point
  pointer: Point
  offset: Point
  bounds: DOMRect
  layout: PotLayout
  originalIndex: number
  lastScroll: number
  lastSwap?: Point
  lastFrame?: number
  frame: number
  needsHitTest: boolean
  dragging: boolean
  listeners: AbortController
  onClick: () => void
}

function getPotSlots(grid: HTMLDivElement) {
  return Array.from(grid.children).flatMap((item) => {
    if (!(item instanceof HTMLElement) || !item.dataset.potId) return []

    // Offsets reflect the destination grid even while a card's transform is springing.
    return [
      {
        potId: item.dataset.potId,
        left: item.offsetLeft,
        top: item.offsetTop,
        width: item.offsetWidth,
        height: item.offsetHeight,
      },
    ]
  })
}

function updateOrder(active: DragSession) {
  const gridBounds = active.grid.getBoundingClientRect()
  const { x, y } = active.pointer
  if (x < gridBounds.left || x > gridBounds.right) return false

  const pageY = y + window.scrollY
  const lastSwap = active.lastSwap
  if (lastSwap && Math.hypot(x - lastSwap.x, pageY - lastSwap.y) < 12)
    return false

  const targetId = getClosestPotSlot(
    getPotSlots(active.grid),
    x - gridBounds.left,
    y - gridBounds.top,
  )
  if (!targetId || targetId === active.potId) return false

  const from = active.layout.findIndex(({ potId }) => potId === active.potId)
  const target = active.layout.findIndex(({ potId }) => potId === targetId)
  if (target < 0) return false

  active.layout = applyPotLayoutChange(active.layout, {
    type: "move",
    potId: active.potId,
    targetId,
    placement: from < target ? "after" : "before",
  })
  active.lastSwap = { x, y: pageY }
  return true
}

function getMove(active: DragSession): PotLayoutMove | undefined {
  const index = active.layout.findIndex(({ potId }) => potId === active.potId)
  if (index === active.originalIndex) return

  const next = active.layout[index + 1]
  const neighbor = next ?? active.layout[index - 1]
  if (!neighbor) return

  return {
    type: "move",
    potId: active.potId,
    targetId: neighbor.potId,
    placement: next ? "before" : "after",
  }
}

export function usePotReorder(
  gridRef: RefObject<HTMLDivElement | null>,
  layout: PotLayout,
  onCommit: (move: PotLayoutMove) => void,
  reduceMotion: boolean,
  spring: Transition,
) {
  const session = useRef<DragSession | null>(null)
  const [preview, setPreview] = useState<DragPreview>()
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  useEffect(
    () => () => {
      const active = session.current
      if (!active) return
      cancelAnimationFrame(active.frame)
      active.listeners.abort()
    },
    [],
  )

  useLayoutEffect(() => {
    if (!preview || preview.layout) return

    const grid = gridRef.current
    const slot =
      grid && getPotSlots(grid).find(({ potId }) => potId === preview.potId)
    const bounds = grid?.getBoundingClientRect()
    const transition = reduceMotion || !slot ? { duration: 0 } : spring
    const horizontal = animate(
      x,
      slot && bounds ? bounds.left + slot.left : x.get(),
      transition,
    )
    const vertical = animate(
      y,
      slot && bounds ? bounds.top + slot.top : y.get(),
      transition,
    )

    void Promise.all([horizontal, vertical]).then(() => {
      setPreview((current) => (current === preview ? undefined : current))
    })
    return () => {
      horizontal.stop()
      vertical.stop()
    }
  }, [gridRef, preview, reduceMotion, spring, x, y])

  function showPreview(active: DragSession) {
    setPreview({
      potId: active.potId,
      width: active.bounds.width,
      height: active.bounds.height,
      layout: active.layout,
    })
  }

  function runFrame(active: DragSession, now: number) {
    if (session.current !== active) return

    const elapsed = Math.min(32, now - (active.lastFrame ?? now)) / 1000
    active.lastFrame = now
    const speed = getPotDragScrollSpeed(active.pointer.y, window.innerHeight)
    if (speed) window.scrollBy({ top: speed * elapsed, behavior: "instant" })

    const scroll = window.scrollY
    if (active.needsHitTest || scroll !== active.lastScroll) {
      active.needsHitTest = false
      active.lastScroll = scroll
      if (updateOrder(active)) showPreview(active)
    }

    active.frame = requestAnimationFrame((time) => runFrame(active, time))
  }

  function finish(active: DragSession, cancelled: boolean) {
    session.current = null
    cancelAnimationFrame(active.frame)
    active.listeners.abort()
    if (active.grid.hasPointerCapture(active.pointerId)) {
      active.grid.releasePointerCapture(active.pointerId)
    }

    if (active.dragging) {
      if (!cancelled) {
        if (active.needsHitTest || window.scrollY !== active.lastScroll)
          updateOrder(active)
        const move = getMove(active)
        if (move) onCommit(move)
      }
      setPreview((current) => current && { ...current, layout: null })
    } else if (!cancelled) {
      active.onClick()
    }
  }

  function start(
    event: PointerEvent<HTMLButtonElement>,
    potId: string,
    onClick: () => void,
  ) {
    const grid = gridRef.current
    const grip = event.currentTarget
    const item = grip.closest("[data-pot-id]")
    if (!grid || !item || session.current || event.pointerType !== "mouse")
      return

    grip.focus({ preventScroll: true })
    grid.setPointerCapture(event.pointerId)
    const bounds = item.getBoundingClientRect()
    const origin = { x: event.clientX, y: event.clientY }
    const listeners = new AbortController()
    const active: DragSession = {
      potId,
      grid,
      grip,
      bounds,
      origin,
      pointer: origin,
      layout,
      listeners,
      onClick,
      pointerId: event.pointerId,
      offset: { x: origin.x - bounds.left, y: origin.y - bounds.top },
      originalIndex: layout.findIndex((entry) => entry.potId === potId),
      lastScroll: window.scrollY,
      frame: 0,
      needsHitTest: false,
      dragging: false,
    }
    session.current = active

    window.addEventListener(
      "keydown",
      (event) => {
        if (event.key === "Escape") {
          event.preventDefault()
          finish(active, true)
          grip.focus({ preventScroll: true })
        }
      },
      { signal: listeners.signal },
    )
    window.addEventListener("blur", () => finish(active, true), {
      signal: listeners.signal,
    })
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const active = session.current
    if (!active || event.pointerId !== active.pointerId) return
    if (!active.grip.getClientRects().length) {
      finish(active, true)
      return
    }

    active.pointer = { x: event.clientX, y: event.clientY }
    const { pointer, origin, offset } = active
    if (
      !active.dragging &&
      Math.hypot(pointer.x - origin.x, pointer.y - origin.y) < 6
    )
      return

    if (!active.dragging) {
      x.stop()
      y.stop()
    }
    x.set(pointer.x - offset.x)
    y.set(pointer.y - offset.y)
    active.needsHitTest = true
    if (active.dragging) return

    active.dragging = true
    showPreview(active)
    active.frame = requestAnimationFrame((now) => runFrame(active, now))
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    const active = session.current
    if (!active || event.pointerId !== active.pointerId) return
    onPointerMove(event)
    if (session.current === active) finish(active, false)
  }

  function onPointerCancel(event: PointerEvent<HTMLDivElement>) {
    const active = session.current
    if (active && event.pointerId === active.pointerId) finish(active, true)
  }

  return {
    start,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    preview,
    x,
    y,
  }
}
