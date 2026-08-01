import { z } from "zod"

export const uiPreferencesSchema = z.object({
  hideAmounts: z.boolean().default(false),
})

export type UiPreferences = z.infer<typeof uiPreferencesSchema>

export const defaultUiPreferences: UiPreferences = {
  hideAmounts: false,
}

export function parseUiPreferences(raw: unknown): UiPreferences {
  const parsed = uiPreferencesSchema.safeParse(
    raw && typeof raw === "object" ? raw : {},
  )

  if (!parsed.success) {
    return { ...defaultUiPreferences }
  }

  return {
    hideAmounts: parsed.data.hideAmounts,
  }
}

export function getHiddenValueAriaLabel(): string {
  return "Hidden. Turn off privacy mode to show it."
}

export function getHiddenAmountAriaLabel(): string {
  return "Amount hidden. Turn off privacy mode to show it."
}
