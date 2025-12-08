import { Skeleton } from "@/components/ui/skeleton";
import { TableFloorPlanSkeleton, DashboardCardsSkeleton } from "@/components/skeletons";

export default function SeatingLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* Stats skeleton */}
      <DashboardCardsSkeleton />

      {/* Tables section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-10 w-36" />
        </div>
        <TableFloorPlanSkeleton />
      </div>
    </div>
  );
}
