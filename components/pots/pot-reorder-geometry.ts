interface PotSlot {
  potId: string
  left: number
  top: number
  width: number
  height: number
}

export function getClosestPotSlot(slots: PotSlot[], x: number, y: number) {
  let closest: string | undefined
  let bestEdgeDistance = Infinity
  let bestCenterDistance = Infinity

  for (const slot of slots) {
    const dx = Math.max(slot.left - x, 0, x - slot.left - slot.width)
    const dy = Math.max(slot.top - y, 0, y - slot.top - slot.height)
    const edgeDistance = dx * dx + dy * dy
    const cx = x - slot.left - slot.width / 2
    const cy = y - slot.top - slot.height / 2
    const centerDistance = cx * cx + cy * cy

    if (
      edgeDistance < bestEdgeDistance ||
      (edgeDistance === bestEdgeDistance && centerDistance < bestCenterDistance)
    ) {
      closest = slot.potId
      bestEdgeDistance = edgeDistance
      bestCenterDistance = centerDistance
    }
  }

  return closest
}

export function getPotDragScrollSpeed(y: number, viewportHeight: number) {
  const edge = Math.min(88, viewportHeight / 4)
  const top = Math.max(0, Math.min(1, (edge - y) / edge))
  const bottom = Math.max(0, Math.min(1, (y - viewportHeight + edge) / edge))

  return (bottom ** 2 - top ** 2) * 1320
}
