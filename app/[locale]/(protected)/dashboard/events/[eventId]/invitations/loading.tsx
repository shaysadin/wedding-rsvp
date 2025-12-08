import { Skeleton } from "@/components/ui/skeleton";
import { InvitationsTableSkeleton } from "@/components/skeletons";

export default function InvitationsLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-24" />
      </div>

      {/* Image upload section skeleton */}
      <div className="rounded-lg border p-6 space-y-4">
        <Skeleton className="h-6 w-48" />
        <div className="flex items-center justify-center h-48 border-2 border-dashed rounded-lg">
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>

      {/* Guests table skeleton */}
      <InvitationsTableSkeleton />
    </div>
  );
}
