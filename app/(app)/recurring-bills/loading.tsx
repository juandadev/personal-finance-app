import { PageHeading } from "@/components/overview/page-heading"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function RecurringBillsLoading() {
  return (
    <div
      aria-label="Loading recurring bills data"
      className="flex min-h-0 flex-col gap-8 @[829px]/main:h-[calc(100dvh-var(--page-chrome-block))] @[829px]/main:overflow-hidden"
    >
      <p className="sr-only">Loading recurring bills...</p>
      <PageHeading title="Recurring Bills" fixed className="shrink-0" />

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden lg:@[829px]/main:flex-row">
        <div className="grid shrink-0 content-start gap-4 self-start md:grid-cols-2 lg:@[829px]/main:w-85 lg:@[829px]/main:grid-cols-1 lg:@[829px]/main:gap-6">
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

        <Card className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="mb-6 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-11 w-full rounded-lg sm:w-64" />
          </div>

          <div className="min-h-0 flex-1 space-y-8 overflow-y-auto pr-3">
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
          </div>
        </Card>
      </div>
    </div>
  )
}
