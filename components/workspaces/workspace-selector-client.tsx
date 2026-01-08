"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { PlanTier } from "@prisma/client";

import { getWorkspaces } from "@/actions/workspaces";
import { WorkspaceSelector } from "./workspace-selector";

interface Workspace {
  id: string;
  name: string;
  slug: string;
  isDefault: boolean;
  _count?: {
    events: number;
  };
}

interface WorkspaceSelectorClientProps {
  /** Show in compact mode for sidebars */
  compact?: boolean;
}

export function WorkspaceSelectorClient({ compact }: WorkspaceSelectorClientProps) {
  const { status } = useSession();
  const pathname = usePathname();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [userPlan, setUserPlan] = useState<PlanTier>(PlanTier.FREE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Extract locale from path
  const locale = pathname?.split("/")[1] || "he";

  const fetchWorkspaces = useCallback(async () => {
    if (status !== "authenticated") return;

    try {
      setLoading(true);
      setError(null);
      const result = await getWorkspaces();
      if (result.error) {
        setError(result.error);
      } else {
        setWorkspaces(result.workspaces || []);
        // Use fresh plan from server instead of potentially stale session
        if (result.userPlan) {
          setUserPlan(result.userPlan);
        }
      }
    } catch (err) {
      setError("Failed to load workspaces");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces, refreshKey]);

  // Callback to refetch workspaces after switching
  const handleWorkspaceChange = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  // Don't show if not authenticated or still loading session
  if (status === "loading" || status !== "authenticated") {
    return null;
  }

  // Show loading skeleton only on initial load when we have no workspaces yet
  // After initial load, keep showing the selector while refreshing in background
  if (loading && workspaces.length === 0) {
    // We don't know the plan yet, so don't show skeleton
    // The selector will appear after loading if user is BUSINESS
    return null;
  }

  // Don't show if error
  if (error) {
    return null;
  }

  // Only BUSINESS users can see the workspace switcher
  // All other users have exactly one workspace and can't manage it
  if (userPlan !== PlanTier.BUSINESS) {
    return null;
  }

  return (
    <WorkspaceSelector
      workspaces={workspaces}
      currentWorkspaceId={workspaces.find((w) => w.isDefault)?.id}
      userPlan={userPlan}
      locale={locale}
      onWorkspaceChange={handleWorkspaceChange}
    />
  );
}
