"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// RsvpCustomizer Skeleton - mimics the customizer layout with sidebar + preview
export function RsvpCustomizerSkeleton() {
  return (
    <div className="flex h-full w-full gap-4">
      {/* Left sidebar - settings panel */}
      <div className="w-80 shrink-0 space-y-4 rounded-lg border bg-card p-4">
        {/* Tabs */}
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-9 w-16 rounded-md" />
          ))}
        </div>

        {/* Settings sections */}
        <div className="space-y-4">
          <Skeleton className="h-5 w-24" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
            ))}
          </div>
        </div>

        {/* Color pickers */}
        <div className="space-y-4">
          <Skeleton className="h-5 w-20" />
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Skeleton key={i} className="h-8 w-8 rounded-full" />
            ))}
          </div>
        </div>

        {/* Sliders */}
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Right side - preview area */}
      <div className="flex flex-1 flex-col gap-4">
        {/* Device toggle */}
        <div className="flex justify-center gap-2">
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>

        {/* Preview frame */}
        <div className="flex flex-1 items-center justify-center rounded-lg border bg-muted/30 p-8">
          <div className="h-[500px] w-[300px] rounded-2xl border-4 border-muted bg-background p-2">
            <div className="flex h-full w-full flex-col items-center justify-center gap-4 rounded-xl bg-muted/20 p-4">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-24 w-24 rounded-full" />
              <Skeleton className="h-10 w-full max-w-[200px] rounded-md" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// TableFloorPlan Skeleton - mimics the seating floor plan layout
export function TableFloorPlanSkeleton() {
  return (
    <div className="flex h-full w-full flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between rounded-lg border bg-card p-3">
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>
      </div>

      {/* Floor plan area */}
      <div className="relative flex-1 rounded-lg border bg-muted/20">
        {/* Grid pattern background */}
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}
        />

        {/* Mock tables */}
        <div className="relative h-full w-full p-8">
          {[
            { top: '20%', left: '15%', size: 100 },
            { top: '20%', left: '45%', size: 100 },
            { top: '20%', left: '75%', size: 100 },
            { top: '55%', left: '25%', size: 120, rect: true },
            { top: '55%', left: '60%', size: 100 },
          ].map((table, i) => (
            <Skeleton
              key={i}
              className={cn(
                "absolute",
                table.rect ? "rounded-lg" : "rounded-full"
              )}
              style={{
                top: table.top,
                left: table.left,
                width: table.size,
                height: table.rect ? table.size * 0.6 : table.size,
              }}
            />
          ))}
        </div>
      </div>

      {/* Unseated guests panel */}
      <div className="rounded-lg border bg-card p-4">
        <Skeleton className="mb-3 h-5 w-32" />
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-md" />
          ))}
        </div>
      </div>
    </div>
  );
}

// BillingPageContent Skeleton - mimics billing/pricing layout
export function BillingPageContentSkeleton() {
  return (
    <div className="space-y-8">
      {/* Current plan card */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-32 rounded-md" />
        </div>
      </div>

      {/* Billing toggle */}
      <div className="flex justify-center">
        <Skeleton className="h-10 w-48 rounded-full" />
      </div>

      {/* Pricing cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border bg-card p-6 space-y-4">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-4 w-full" />
            <div className="space-y-2 py-4">
              {[1, 2, 3, 4, 5].map((j) => (
                <div key={j} className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </div>
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

// GuestsTable Skeleton - mimics data table layout
export function GuestsTableSkeleton() {
  return (
    <div className="space-y-4">
      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-10 w-64 rounded-md" />
        <Skeleton className="h-10 w-32 rounded-md" />
        <Skeleton className="h-10 w-32 rounded-md" />
        <div className="ml-auto flex gap-2">
          <Skeleton className="h-10 w-28 rounded-md" />
          <Skeleton className="h-10 w-28 rounded-md" />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        {/* Header */}
        <div className="flex items-center gap-4 border-b bg-muted/30 px-4 py-3">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="ml-auto h-4 w-8" />
        </div>

        {/* Rows */}
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="flex items-center gap-4 border-b px-4 py-3 last:border-0">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="ml-auto h-8 w-8 rounded-md" />
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-8 w-8 rounded-md" />
          ))}
        </div>
      </div>
    </div>
  );
}

// Chart Skeleton - mimics chart display
export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg border bg-card p-6", className)}>
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>
      <div className="flex h-[300px] items-end gap-2">
        {[40, 65, 45, 80, 55, 70, 50, 85, 60, 75, 45, 90].map((h, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t-md"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}

// Dashboard Cards Skeleton
export function DashboardCardsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
          <Skeleton className="mt-3 h-8 w-16" />
          <Skeleton className="mt-2 h-3 w-32" />
        </div>
      ))}
    </div>
  );
}

// Event Cards Skeleton
export function EventCardsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-lg border bg-card overflow-hidden">
          <Skeleton className="h-32 w-full" />
          <div className="p-4 space-y-3">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Generic Page Skeleton
export function PageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Content */}
      <div className="space-y-4">
        <Skeleton className="h-64 w-full rounded-lg" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

// Invitations Table Skeleton
export function InvitationsTableSkeleton() {
  return (
    <div className="space-y-4">
      {/* Image upload area */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-24 w-24 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-9 w-32 rounded-md" />
          </div>
        </div>
      </div>

      {/* Table */}
      <GuestsTableSkeleton />
    </div>
  );
}

// Event Selector Skeleton
export function EventSelectorSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border bg-card p-6 space-y-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
