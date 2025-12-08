import { Skeleton } from "@/components/ui/skeleton";
import { EventCardsSkeleton } from "@/components/skeletons";

export default function EventsLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Events grid */}
      <EventCardsSkeleton />
    </div>
  );
}
