import type { Metadata, Viewport } from "next"
import { Public_Sans } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { NuqsAdapter } from "nuqs/adapters/next/app"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public-sans",
  display: "swap",
})

export const metadata: Metadata = {
  title: "finance — Personal Finance",
  description:
    "Track your balance, budgets, pots, transactions and recurring bills.",
  generator: "v0.app",
  robots: {
    index: false,
    follow: false,
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

const analyticsEnabled =
  process.env.NODE_ENV === "production" &&
  process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === "true"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${publicSans.variable} bg-background`}>
      <body className="font-sans antialiased">
        <NuqsAdapter>{children}</NuqsAdapter>
        <Toaster />
        {analyticsEnabled ? <Analytics /> : null}
      </body>
    </html>
  )
}
