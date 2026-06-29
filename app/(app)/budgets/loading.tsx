import { PageHeading } from "@/components/overview/page-heading"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

function BudgetCardSkeleton() {
  return (
    <Card className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Skeleton className="size-4 rounded-full" />
          <Skeleton className="h-6 w-32" />
        </div>
        <Skeleton className="size-5 rounded-full" />
      </div>

      <div className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-24" />
        </div>
        <Skeleton className="h-8 w-full rounded-lg" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-12 rounded-lg" />
        <Skeleton className="h-12 rounded-lg" />
      </div>
    </Card>
  )
}

export default function BudgetsLoading() {
  return (
    <div aria-label="Loading budgets data">
      <p className="sr-only">Loading budgets...</p>
      <PageHeading title="Budgets" fixed>
        <Skeleton className="h-11 w-32 rounded-lg" />
      </PageHeading>

      <div className="space-y-6 lg:@[829px]/main:grid lg:@[829px]/main:grid-cols-[380px_minmax(0,1fr)] lg:@[829px]/main:gap-6 lg:@[829px]/main:space-y-0">
        <div className="lg:@[829px]/main:top-24 lg:@[829px]/main:self-start">
          <Card className="flex flex-col gap-8">
            <div className="flex flex-col items-center gap-6">
              <Skeleton className="size-60 max-w-full rounded-full" />
              <div className="space-y-2 text-center">
                <Skeleton className="mx-auto h-4 w-28" />
                <Skeleton className="mx-auto h-8 w-36" />
              </div>
            </div>
            <div className="divide-muted-foreground/10 flex flex-col divide-y">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex items-center gap-4 py-4">
                  <Skeleton className="h-10 w-1 rounded-full" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-5 w-16" />
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-6 lg:@[829px]/main:h-[calc(100dvh-160px)] lg:@[829px]/main:overflow-y-auto lg:@[829px]/main:rounded-xl lg:@[829px]/main:pr-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <BudgetCardSkeleton key={index} />
          ))}
        </div>
      </div>
    </div>
  )
}
