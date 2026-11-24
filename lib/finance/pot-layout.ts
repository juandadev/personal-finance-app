import { z } from "zod"

export const potCardSizeSchema = z.enum(["standard", "wide", "tall"])
export type PotCardSize = z.infer<typeof potCardSizeSchema>

export const potLayoutSchema = z.array(
  z.object({ potId: z.string().uuid(), size: potCardSizeSchema }),
)
export type PotLayout = z.infer<typeof potLayoutSchema>

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
