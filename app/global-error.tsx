"use client"

import { useEffect } from "react"

import "./globals.css"

// This boundary only fires when the root layout itself throws, so it has to
// render its own <html>/<body> and cannot assume any app providers are
// mounted. Keep it minimal and self-contained.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Unhandled root error.", { digest: error.digest })
  }, [error.digest])

  return (
    <html lang="en" className="bg-background">
      <body className="font-sans antialiased">
        <div className="bg-background flex min-h-svh items-center justify-center px-5 py-8">
          <div className="bg-card w-full max-w-md rounded-xl p-6 text-center md:p-8">
            <h1 className="text-foreground text-xl font-bold tracking-tight">
              Something went wrong
            </h1>
            <p className="text-muted-foreground mt-2 text-sm leading-normal">
              The app failed to load. Try again in a moment.
            </p>
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={reset}
                className="bg-primary text-primary-foreground inline-flex h-13 items-center justify-center rounded-lg px-6 text-sm font-bold transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
