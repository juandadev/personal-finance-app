import { PageHeading } from "@/components/overview/page-heading"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

function OverviewSummarySkeleton({ primary }: { primary?: boolean }) {
  return (
    <Card
      padding="overview"
      variant={primary ? "primary" : "default"}
      className="flex flex-col gap-3"
    >
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-9 w-32" />
    </Card>
  )
}

function OverviewPanelSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <Card className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="divide-muted-foreground/10 flex flex-col divide-y">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="flex items-center gap-4 py-3">
            <Skeleton className="size-10 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-36 max-w-full" />
              <Skeleton className="h-3 w-24 max-w-full" />
            </div>
            <Skeleton className="h-5 w-16" />
          </div>
        ))}
      </div>
    </Card>
  )
}

export default function OverviewLoading() {
  return (
    <div
      className="mx-auto flex min-h-0 w-full max-w-6xl flex-col gap-8 @[829px]/main:h-[calc(100dvh-var(--page-chrome-block))] @[829px]/main:overflow-hidden"
      aria-label="Loading overview data"
    >
      <p className="sr-only">Loading overview...</p>
      <PageHeading title="Overview" className="shrink-0" />

      <div className="grid shrink-0 gap-3 md:grid-cols-3 md:gap-6">
        <OverviewSummarySkeleton primary />
        <OverviewSummarySkeleton />
        <OverviewSummarySkeleton />
      </div>

      <div className="grid min-h-0 flex-1 gap-6 lg:@[829px]/main:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <Card className="flex flex-col gap-6">
            <div className="flex items-center justify-between gap-4">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="flex items-center gap-5">
              <Skeleton className="size-28 rounded-full" />
              <div className="flex min-w-0 flex-1 flex-col gap-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <Skeleton className="size-4 rounded-full" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                ))}
              </div>
            </div>
          </Card>
          <OverviewPanelSkeleton />
        </div>
        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto lg:@[829px]/main:pr-3">
          <OverviewPanelSkeleton rows={4} />
          <OverviewPanelSkeleton rows={3} />
          <OverviewPanelSkeleton rows={3} />
        </div>
      </div>
    </div>
  )
}
