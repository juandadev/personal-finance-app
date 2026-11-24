import { PageHeading } from "@/components/overview/page-heading"
import styles from "@/components/pots/pots-layout.module.css"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

function PotCardSkeleton({ nearGoal }: { nearGoal?: boolean }) {
  return (
    <Card
      className={cn(
        "flex flex-col gap-8",
        nearGoal && [styles.wideTablet, styles.wideDesktop],
      )}
      padding="compact"
    >
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

      <div className="mt-auto grid grid-cols-[1fr_1fr_auto] gap-2">
        <Skeleton className="h-11 rounded-lg" />
        <Skeleton className="h-11 rounded-lg" />
        <Skeleton className="size-11 rounded-full" />
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

      <div className="space-y-8 lg:mt-8">
        <div className={styles.summary}>
          {Array.from({ length: 3 }, (_, index) => (
            <Card key={index} padding="overview">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="mt-3 h-9 w-20" />
            </Card>
          ))}
        </div>
        <div className="space-y-4">
          <Skeleton className="h-7 w-24" />
          <div className={styles.grid}>
            <PotCardSkeleton nearGoal />
            <PotCardSkeleton />
            <PotCardSkeleton />
            <PotCardSkeleton />
            <PotCardSkeleton />
          </div>
        </div>
      </div>
    </div>
  )
}
