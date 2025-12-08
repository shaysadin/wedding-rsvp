import { DashboardCardsSkeleton, EventCardsSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Stats cards */}
      <DashboardCardsSkeleton />

      {/* Events section */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <EventCardsSkeleton />
      </div>
    </div>
  );
}
