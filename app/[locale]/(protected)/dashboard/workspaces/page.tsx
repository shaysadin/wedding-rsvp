import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { PlanTier, UserRole } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { supportsMultipleWorkspaces } from "@/config/plans";
import { WorkspacesPageClient } from "./workspaces-page-client";

export const dynamic = "force-dynamic";

export default async function WorkspacesPage() {
  const user = await getCurrentUser();
  const locale = await getLocale();
  const t = await getTranslations("workspaces");

  if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
    redirect(`/${locale}/login`);
  }

  // Check if user can have multiple workspaces
  const canHaveMultiple = supportsMultipleWorkspaces(user.plan);

  // Get user's workspaces
  const workspaces = await prisma.workspace.findMany({
    where: { ownerId: user.id },
    include: {
      _count: {
        select: { events: true },
      },
    },
    orderBy: [
      { isDefault: "desc" },
      { createdAt: "asc" },
    ],
  });

  // If user doesn't have any workspaces, create a default one
  if (workspaces.length === 0) {
    const slug = `workspace-${user.id.slice(-8)}`;
    const defaultWorkspace = await prisma.workspace.create({
      data: {
        name: locale === "he" ? "האירועים שלי" : "My Events",
        slug,
        ownerId: user.id,
        isDefault: true,
      },
      include: {
        _count: {
          select: { events: true },
        },
      },
    });
    workspaces.push(defaultWorkspace);
  }

  return (
    <WorkspacesPageClient
      workspaces={workspaces}
      userPlan={user.plan}
      locale={locale}
      canHaveMultiple={canHaveMultiple}
    />
  );
}
