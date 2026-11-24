"use client"

import { DotsSixIcon } from "@phosphor-icons/react"
import { useState, type PointerEvent } from "react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { PotLayout, PotLayoutMove } from "@/lib/finance/pot-layout"
import styles from "./pots-layout.module.css"

interface PotCardMoveProps {
  name: string
  layout: PotLayout
  index: number
  onStart: (
    event: PointerEvent<HTMLButtonElement>,
    potId: string,
    onClick: () => void,
  ) => void
  onMove: (move: PotLayoutMove) => void
}

export function PotCardMove({
  name,
  layout,
  index,
  onStart,
  onMove,
}: PotCardMoveProps) {
  const [open, setOpen] = useState(false)
  const { potId } = layout[index]

  function moveTo(targetIndex: number) {
    if (targetIndex === index || !layout[targetIndex]) return

    onMove({
      type: "move",
      potId,
      targetId: layout[targetIndex].potId,
      placement: targetIndex < index ? "before" : "after",
    })
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        className={styles.moveHandle}
        aria-label={`Move ${name}`}
        title="Drag to reorder or click for move options"
        onPointerDown={(event) => {
          if (open || event.button !== 0 || !event.isPrimary) return
          event.preventDefault()
          onStart(event, potId, () => setOpen(true))
        }}
        onClick={(event) => {
          if (event.detail === 0) setOpen(true)
        }}
      >
        <DotsSixIcon className="size-4 rotate-90" weight="bold" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="center"
        className="motion-reduce:animate-none"
      >
        <DropdownMenuItem disabled={index === 0} onSelect={() => moveTo(0)}>
          Move to beginning
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={index === 0}
          onSelect={() => moveTo(index - 1)}
        >
          Move earlier
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={index === layout.length - 1}
          onSelect={() => moveTo(index + 1)}
        >
          Move later
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={index === layout.length - 1}
          onSelect={() => moveTo(layout.length - 1)}
        >
          Move to end
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
