import type { PotCardSize } from "@/lib/finance/pot-layout"

export function getPotResizePreview(
  start: PotCardSize,
  current: PotCardSize,
  dx: number,
  dy: number,
): PotCardSize {
  const x = Math.abs(dx)
  const y = Math.abs(dy)
  const distance = Math.max(x, y)

  // The gap between thresholds keeps a card from flipping sizes at the boundary.
  if (distance < 20) return start
  if (distance < 34 || (Math.abs(x - y) < 8 && current !== start)) {
    return current
  }

  if (x >= y) {
    return dx > 0 ? "wide" : start === "wide" ? "standard" : start
  }

  return dy > 0 ? "tall" : start === "tall" ? "standard" : start
}
