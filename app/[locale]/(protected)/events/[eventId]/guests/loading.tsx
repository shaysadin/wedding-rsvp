import { Skeleton } from "@/components/ui/skeleton";
import { DashboardCardsSkeleton, GuestsTableSkeleton } from "@/components/skeletons";

export default function GuestsLoading() {
  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="space-y-1">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>

      {/* Stats cards */}
      <DashboardCardsSkeleton />

      {/* Guest Table */}
      <GuestsTableSkeleton />
    </div>
  );
}
