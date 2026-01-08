import { Skeleton } from "@/components/ui/skeleton";
import { GuestsTableSkeleton } from "@/components/skeletons";

export default function RsvpLoading() {
  return (
    <div className="space-y-6">
      {/* Header with event selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-10 w-48" />
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-lg border bg-card p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-md" />
              <Skeleton className="h-6 w-12" />
            </div>
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>

      {/* RSVP table */}
      <GuestsTableSkeleton />
    </div>
  );
}
