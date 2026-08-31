import "server-only"

import { headers } from "next/headers"

export async function getRequestOrigin() {
  const headerList = await headers()
  const origin = headerList.get("origin")
  if (origin) return origin

  const referer = headerList.get("referer")
  if (!referer) return ""

  try {
    return new URL(referer).origin
  } catch {
    return ""
  }
}

export function isLocalDevOrigin(origin: string) {
  try {
    const { hostname } = new URL(origin)
    return hostname === "localhost" || hostname === "127.0.0.1"
  } catch {
    return false
  }
}

export function blockedAuthOriginMessage(origin: string) {
  if (!origin || isLocalDevOrigin(origin)) {
    return "We could not complete this request from the current address."
  }

  return `Sign-in from ${origin} was blocked. Add this origin to Neon Auth trusted domains, or open the app on localhost.`
}
