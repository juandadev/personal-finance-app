import { z } from "zod"

export const potCardSizeSchema = z.enum(["standard", "wide", "tall"])
export type PotCardSize = z.infer<typeof potCardSizeSchema>

const potIdSchema = z.string().uuid()

export const potLayoutSchema = z.array(
  z.object({
    potId: potIdSchema,
    size: potCardSizeSchema,
    highlighted: z.boolean().optional(),
  }),
)
export type PotLayout = z.infer<typeof potLayoutSchema>

export const potLayoutChangeSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("resize"),
    potId: potIdSchema,
    size: potCardSizeSchema,
  }),
  z.object({
    type: z.literal("highlight"),
    potId: potIdSchema,
    highlighted: z.boolean(),
  }),
  z.object({
    type: z.literal("move"),
    potId: potIdSchema,
    targetId: potIdSchema,
    placement: z.enum(["before", "after"]),
  }),
])
export type PotLayoutChange = z.infer<typeof potLayoutChangeSchema>
export type PotLayoutMove = Extract<PotLayoutChange, { type: "move" }>

export function getOrderedPotLayout(
  potIds: readonly string[],
  savedLayout: PotLayout,
): PotLayout {
  const remaining = new Set(potIds)
  const layout = savedLayout.filter(({ potId }) => remaining.delete(potId))

  for (const potId of remaining) {
    layout.push({ potId, size: "standard" })
  }

  return layout
}

export function applyPotLayoutChange(
  layout: PotLayout,
  change: PotLayoutChange,
): PotLayout {
  if (change.type !== "move") {
    const update =
      change.type === "resize"
        ? { size: change.size }
        : { highlighted: change.highlighted }

    return layout.map((entry) =>
      entry.potId === change.potId ? { ...entry, ...update } : entry,
    )
  }

  const from = layout.findIndex(({ potId }) => potId === change.potId)
  const target = layout.findIndex(({ potId }) => potId === change.targetId)
  if (from < 0 || target < 0 || from === target) return layout

  const moved = [...layout]
  const [entry] = moved.splice(from, 1)
  const insertionIndex =
    target + (change.placement === "after" ? 1 : 0) - (from < target ? 1 : 0)
  moved.splice(insertionIndex, 0, entry)
  return moved
}
