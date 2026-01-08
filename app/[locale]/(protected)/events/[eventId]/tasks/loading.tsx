import { Skeleton } from "@/components/ui/skeleton";

export default function TasksLoading() {
  return (
    <div className="flex flex-1 flex-col space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Task board columns */}
      <div className="flex flex-1 gap-4 overflow-x-auto pb-4">
        {["Backlog", "Todo", "In Progress", "Done"].map((column, idx) => (
          <div key={idx} className="flex w-72 shrink-0 flex-col rounded-lg border bg-muted/30">
            {/* Column header */}
            <div className="flex items-center justify-between border-b p-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-5 rounded-full" />
              </div>
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>

            {/* Task cards */}
            <div className="flex-1 space-y-2 p-2">
              {[1, 2, 3].slice(0, idx === 3 ? 2 : 3).map((i) => (
                <div key={i} className="rounded-lg border bg-card p-3 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                  <div className="flex items-center justify-between pt-1">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-5 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
