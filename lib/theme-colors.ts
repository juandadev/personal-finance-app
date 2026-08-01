export const themeColorClasses = {
  "chart-1": {
    bg: "bg-chart-1",
    border: "border-chart-1",
    text: "text-chart-1",
  },
  "chart-2": {
    bg: "bg-chart-2",
    border: "border-chart-2",
    text: "text-chart-2",
  },
  "chart-3": {
    bg: "bg-chart-3",
    border: "border-chart-3",
    text: "text-chart-3",
  },
  "chart-4": {
    bg: "bg-chart-4",
    border: "border-chart-4",
    text: "text-chart-4",
  },
  "chart-5": {
    bg: "bg-chart-5",
    border: "border-chart-5",
    text: "text-chart-5",
  },
  destructive: {
    bg: "bg-destructive",
    border: "border-destructive",
    text: "text-destructive",
  },
  warning: {
    bg: "bg-warning",
    border: "border-warning",
    text: "text-warning",
  },
  "finance-purple": {
    bg: "bg-finance-purple",
    border: "border-finance-purple",
    text: "text-finance-purple",
  },
  "finance-turquoise": {
    bg: "bg-finance-turquoise",
    border: "border-finance-turquoise",
    text: "text-finance-turquoise",
  },
  "finance-brown": {
    bg: "bg-finance-brown",
    border: "border-finance-brown",
    text: "text-finance-brown",
  },
  "finance-magenta": {
    bg: "bg-finance-magenta",
    border: "border-finance-magenta",
    text: "text-finance-magenta",
  },
  "finance-blue": {
    bg: "bg-finance-blue",
    border: "border-finance-blue",
    text: "text-finance-blue",
  },
  "finance-grey": {
    bg: "bg-finance-grey",
    border: "border-finance-grey",
    text: "text-finance-grey",
  },
  "finance-army": {
    bg: "bg-finance-army",
    border: "border-finance-army",
    text: "text-finance-army",
  },
  "finance-pink": {
    bg: "bg-finance-pink",
    border: "border-finance-pink",
    text: "text-finance-pink",
  },
  "finance-yellow": {
    bg: "bg-finance-yellow",
    border: "border-finance-yellow",
    text: "text-finance-yellow",
  },
  "finance-orange": {
    bg: "bg-finance-orange",
    border: "border-finance-orange",
    text: "text-finance-orange",
  },
} as const

export type ThemeColor = keyof typeof themeColorClasses

export function getThemeColorCssVariable(color: ThemeColor) {
  return `var(--color-${color})`
}
