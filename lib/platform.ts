export function isApplePlatform(): boolean {
  if (typeof navigator === "undefined") {
    return false
  }

  const platform =
    "userAgentData" in navigator &&
    typeof navigator.userAgentData === "object" &&
    navigator.userAgentData &&
    "platform" in navigator.userAgentData
      ? String(
          (navigator.userAgentData as { platform?: string }).platform ?? "",
        )
      : navigator.platform

  return /Mac|iPhone|iPod|iPad/i.test(platform)
}

export function getModShiftPeriodShortcutLabel(): string {
  return isApplePlatform() ? "⇧⌘." : "Ctrl+⇧+."
}
