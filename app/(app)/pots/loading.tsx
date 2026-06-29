import { PageHeading } from "@/components/overview/page-heading"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

function PotCardSkeleton() {
  return (
    <Card className="flex flex-col gap-8">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="size-5 rounded-full" />
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-end justify-between gap-4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-24" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
        <div className="flex justify-between gap-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-12 rounded-lg" />
        <Skeleton className="h-12 rounded-lg" />
      </div>
    </Card>
  )
}

export default function PotsLoading() {
  return (
    <div aria-label="Loading pots data">
      <p className="sr-only">Loading pots...</p>
      <PageHeading title="Pots" fixed>
        <Skeleton className="h-11 w-28 rounded-lg" />
      </PageHeading>

      <div className="mt-6 grid gap-6 lg:@[829px]/main:h-[calc(100dvh-160px)] lg:@[829px]/main:grid-cols-2 lg:@[829px]/main:overflow-y-auto lg:@[829px]/main:rounded-xl lg:@[829px]/main:pr-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <PotCardSkeleton key={index} />
        ))}
      </div>
    </div>
  )
}
