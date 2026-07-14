import type { Metadata } from "next"
import { Public_Sans } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { NuqsAdapter } from "nuqs/adapters/next/app"
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
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${publicSans.variable} bg-background`}>
      <body className="font-sans antialiased">
        <NuqsAdapter>{children}</NuqsAdapter>
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  )
}
