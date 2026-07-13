import { createFaviconSvg, getFaviconBackgroundColor } from "@/lib/favicon"

export const contentType = "image/svg+xml"

export default function Icon() {
  const svg = createFaviconSvg(getFaviconBackgroundColor())

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
    },
  })
}
