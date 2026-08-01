import type { Metadata } from "next"

import { ForecastPageContent } from "@/components/forecast/forecast-page-content"

export const metadata: Metadata = {
  title: "Cash Forecast | Finance",
}

export default function ForecastPage() {
  return <ForecastPageContent />
}
