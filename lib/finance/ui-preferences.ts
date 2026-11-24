import { z } from "zod"
import { potLayoutSchema } from "@/lib/finance/pot-layout"

const uiPreferencesSchema = z.object({
  hideAmounts: z.boolean().default(false).catch(false),
  potLayout: potLayoutSchema.default([]).catch([]),
})

export type UiPreferences = z.infer<typeof uiPreferencesSchema>

export const defaultUiPreferences: UiPreferences = {
  hideAmounts: false,
  potLayout: [],
}

export function parseUiPreferences(raw: unknown): UiPreferences {
  const parsed = uiPreferencesSchema.safeParse(
    raw && typeof raw === "object" ? raw : {},
  )

  if (!parsed.success) {
    return { ...defaultUiPreferences }
  }

  return parsed.data
}

export function getHiddenValueAriaLabel(): string {
  return "Hidden. Turn off privacy mode to show it."
}

export function getHiddenAmountAriaLabel(): string {
  return "Amount hidden. Turn off privacy mode to show it."
}
