import type { PotMovementSource } from "@/lib/finance/types"

export const directAdjustmentValue = "direct"
export const primaryAccountValue = "primary_account"
export const defaultCategoryValue = "default_general"

export function getPotMovementSource(
  sourceValue: string,
  values: {
    categoryId: string
    concept: string
    postedAt: string
  },
): PotMovementSource {
  if (sourceValue === directAdjustmentValue) {
    return { type: "direct" }
  }

  if (sourceValue === primaryAccountValue) {
    return {
      type: "primary_account",
      categoryId: values.categoryId || null,
      concept: values.concept || null,
      postedAt: values.postedAt || null,
    }
  }

  return { type: "pot", potId: sourceValue.replace(/^pot:/, "") }
}
