export type FaviconEnvironment = "local" | "preview" | "production"

const FAVICON_BACKGROUND_COLORS: Record<FaviconEnvironment, string> = {
  local: "#be6c49",
  preview: "#3f82b2",
  production: "#201F24",
}

export function getFaviconEnvironment(): FaviconEnvironment {
  if (process.env.VERCEL_ENV === "preview") {
    return "preview"
  }

  if (process.env.VERCEL_ENV === "production") {
    return "production"
  }

  if (process.env.NODE_ENV === "development") {
    return "local"
  }

  return "production"
}

export function getFaviconBackgroundColor(
  environment: FaviconEnvironment = getFaviconEnvironment(),
): string {
  return FAVICON_BACKGROUND_COLORS[environment]
}

export function createFaviconSvg(backgroundColor: string): string {
  return `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="32" height="32" rx="8" fill="${backgroundColor}" />
  <path
    d="M8.192 21.44H2.176V10.24H0V5.312H2.304C2.944 2.272 5.92 0 11.2 0H12.48V4.288H10.24C8.576 4.288 7.776 4.448 7.808 5.312H12.48V10.24H8.192V21.44Z"
    fill="white"
    transform="translate(9.76 5.28)"
  />
</svg>`
}
