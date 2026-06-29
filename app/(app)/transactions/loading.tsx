import { PageHeading } from "@/components/overview/page-heading"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function TransactionsLoading() {
  return (
    <div aria-label="Loading transactions data">
      <p className="sr-only">Loading transactions...</p>
      <PageHeading title="Transactions" />

      <Card className="@container/transactions mt-8 flex flex-col gap-6">
        <div className="flex items-center gap-6 self-stretch @[806px]/transactions:justify-between">
          <Skeleton className="h-11 w-full rounded-lg @[806px]/transactions:max-w-80" />
          <div className="flex items-center gap-6">
            <Skeleton className="size-5 rounded-full @[806px]/transactions:h-11 @[806px]/transactions:w-32 @[806px]/transactions:rounded-lg" />
            <Skeleton className="size-5 rounded-full @[806px]/transactions:h-11 @[806px]/transactions:w-36 @[806px]/transactions:rounded-lg" />
          </div>
        </div>

        <div className="divide-muted-foreground/10 flex flex-col divide-y">
          {Array.from({ length: 10 }).map((_, index) => (
            <div
              key={index}
              className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 py-4 md:grid-cols-[minmax(0,1.5fr)_minmax(8rem,1fr)_minmax(7rem,1fr)_auto]"
            >
              <div className="flex min-w-0 items-center gap-4">
                <Skeleton className="size-10 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-40 max-w-full" />
                  <Skeleton className="h-3 w-24 md:hidden" />
                </div>
              </div>
              <Skeleton className="hidden h-4 w-24 self-center md:block" />
              <Skeleton className="hidden h-4 w-24 self-center md:block" />
              <Skeleton className="h-5 w-20 self-center" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
