import { PageHeading } from "@/components/overview/page-heading"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function ForecastLoading() {
  return (
    <div aria-label="Loading cash forecast">
      <p className="sr-only">Loading forecast...</p>
      <PageHeading title="Cash Forecast" fixed />

      <div className="mt-6 space-y-6">
        <Card className="space-y-6">
          <div className="space-y-3">
            <Skeleton className="h-4 w-56 max-w-full" />
            <Skeleton className="h-10 w-48 max-w-full" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-18 rounded-lg" />
            <Skeleton className="h-18 rounded-lg" />
          </div>
          <Skeleton className="h-72 rounded-lg" />
        </Card>

        <Card className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-7 w-44" />
            <Skeleton className="h-5 w-32" />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-20 rounded-lg" />
            ))}
          </div>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-12 rounded-lg" />
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
