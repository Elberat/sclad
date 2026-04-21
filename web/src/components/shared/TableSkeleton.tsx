import { Skeleton } from '@/components/ui/skeleton'

type TableSkeletonProps = {
  rows?: number
  columns?: number
}

export function TableSkeleton({ rows = 5, columns = 5 }: TableSkeletonProps) {
  return (
    <>
      <div className="grid gap-3 md:hidden">
        {Array.from({ length: Math.min(rows, 4) }).map((_, rowIndex) => (
          <div key={rowIndex} className="rounded-md border p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-2/3" />
              </div>
              <Skeleton className="h-8 w-12" />
            </div>
          </div>
        ))}
      </div>

      <div className="hidden space-y-3 md:block">
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton key={`${rowIndex}-${colIndex}`} className="h-8 w-full" />
            ))}
          </div>
        ))}
      </div>
    </>
  )
}
