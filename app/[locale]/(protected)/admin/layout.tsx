import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { UserRole } from "@prisma/client";

import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";

interface AdminLayoutProps {
  children: React.ReactNode;
}

// Force dynamic rendering to avoid caching issues
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const user = await getCurrentUser();
  const locale = await getLocale();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  // Check the user's current role from the database (not cached session)
  // This ensures role switches are immediately reflected
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true, roles: true },
  });

  // Check both role (single) and roles (array) for backward compatibility
  const isPlatformOwner = dbUser?.role === UserRole.ROLE_PLATFORM_OWNER ||
                          dbUser?.roles?.includes(UserRole.ROLE_PLATFORM_OWNER);

  if (!dbUser || !isPlatformOwner) {
    redirect(`/${locale}/dashboard`);
  }

  return <>{children}</>;
}
