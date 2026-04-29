export const themeOptions = [
  { label: "Green", value: "#277C78" },
  { label: "Yellow", value: "#F2CDAC" },
  { label: "Cyan", value: "#82C9D7" },
  { label: "Navy", value: "#626070" },
  { label: "Red", value: "#C94736" },
  { label: "Purple", value: "#826CB0" },
  { label: "Turquoise", value: "#597C7C" },
  { label: "Brown", value: "#93674F" },
  { label: "Magenta", value: "#934F6F" },
  { label: "Blue", value: "#3F82B2" },
  { label: "Grey", value: "#97A0AC" },
  { label: "Army", value: "#7F9161" },
  { label: "Pink", value: "#AF81BA" },
  { label: "Yellow", value: "#CAB361" },
  { label: "Orange", value: "#BE6C49" },
] as const

export function getCurrentPeriod() {
  return new Date().toISOString().slice(0, 7)
}

export function parseDollarAmount(value: string) {
  const normalizedValue = value.trim().replaceAll(",", "")
  const amount = Number(normalizedValue)

  if (!Number.isFinite(amount) || amount <= 0) {
    return null
  }

  return Math.round(amount * 100)
}

export function formatDollarInput(amount: number) {
  return amount.toFixed(2)
}
