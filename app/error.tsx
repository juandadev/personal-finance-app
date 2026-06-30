"use client"

import { useEffect } from "react"
import Link from "next/link"
import { TriangleAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Unhandled app error:", error)
  }, [error])

  return (
    <div className="bg-background flex min-h-svh items-center justify-center px-5 py-8">
      <Card padding="overview" className="w-full max-w-md text-center">
        <div className="bg-destructive/10 text-destructive mx-auto flex size-12 items-center justify-center rounded-full">
          <TriangleAlert className="size-6" aria-hidden />
        </div>
        <h1 className="text-foreground mt-6 text-xl font-bold tracking-tight">
          Something went wrong
        </h1>
        <p className="text-muted-foreground mt-2 text-sm leading-normal">
          We hit a problem loading this page. Your data is safe — try again, or
          head back to the overview.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button onClick={reset}>Try Again</Button>
          <Button variant="secondary" asChild>
            <Link href="/">Go to Overview</Link>
          </Button>
        </div>
      </Card>
    </div>
  )
}
