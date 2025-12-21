import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function SuppliersLoading() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-11 w-11 rounded-xl" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-2 w-16" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart Skeleton */}
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-40" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px]">
            <Skeleton className="h-[160px] w-[160px] rounded-full" />
          </div>
        </CardContent>
      </Card>

      {/* Filter Bar Skeleton */}
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-10 flex-1 min-w-[200px]" />
        <Skeleton className="h-10 w-[160px]" />
        <Skeleton className="h-10 w-[140px]" />
      </div>

      {/* Table Skeleton */}
      <div className="rounded-lg border">
        <div className="border-b bg-muted/50 p-4">
          <div className="flex gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="border-b p-4 last:border-0">
            <div className="flex items-center gap-4">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-4 w-20" />
              <div className="flex items-center gap-2 w-[180px]">
                <Skeleton className="h-2 flex-1" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
