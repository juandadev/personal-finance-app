import { PageHeading } from "@/components/overview/page-heading"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function RecurringBillsLoading() {
  return (
    <div aria-label="Loading recurring bills data">
      <p className="sr-only">Loading recurring bills...</p>
      <PageHeading title="Recurring Bills" fixed />

      <div className="mt-6 flex flex-col gap-6 lg:@[829px]/main:flex-row">
        <div className="grid gap-4 md:grid-cols-2 lg:@[829px]/main:w-85 lg:@[829px]/main:shrink-0 lg:@[829px]/main:grid-cols-1 lg:@[829px]/main:grid-rows-[minmax(0,max-content)_1fr] lg:@[829px]/main:gap-6">
          <Card
            variant="primary"
            className="flex min-h-48 flex-col justify-end gap-3"
          >
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-9 w-32" />
          </Card>

          <Card className="flex flex-col gap-6">
            <Skeleton className="h-6 w-28" />
            <div className="divide-muted-foreground/10 flex flex-col divide-y">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between gap-4 py-4"
                >
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-1 rounded-full" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                  <Skeleton className="h-5 w-16" />
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card className="flex flex-1 flex-col gap-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-11 w-full rounded-lg sm:w-64" />
          </div>

          <div className="divide-muted-foreground/10 flex flex-col divide-y">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex items-center gap-4 py-4">
                <Skeleton className="size-10 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-40 max-w-full" />
                  <Skeleton className="h-3 w-24 max-w-full" />
                </div>
                <Skeleton className="h-5 w-20" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
