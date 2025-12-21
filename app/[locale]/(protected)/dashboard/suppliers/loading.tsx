import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function SuppliersLoading() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-60" />
          </div>
        </div>
        <Skeleton className="h-10 w-[240px]" />
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <Skeleton className="h-11 w-11 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actions Row Skeleton */}
      <div className="flex gap-3">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Chart and Table Grid Skeleton */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Chart Skeleton */}
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[180px] w-full rounded-lg" />
            <div className="flex gap-4 mt-4 justify-center">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-1">
                  <Skeleton className="h-2 w-2 rounded-full" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Table Skeleton */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex gap-3">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-[160px]" />
            <Skeleton className="h-10 w-[140px]" />
          </div>
          <div className="rounded-lg border">
            <div className="border-b p-4">
              <div className="grid grid-cols-6 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-4" />
                ))}
              </div>
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="border-b p-4 last:border-0">
                <div className="grid grid-cols-6 gap-4 items-center">
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-4 w-20" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-2 flex-1" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-8 w-8" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
