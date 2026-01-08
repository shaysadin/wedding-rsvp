import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { UserRole } from "@prisma/client";

import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { AdminSidebar, MobileAdminSidebar } from "@/components/layout/admin-sidebar";
import { UserAccountNav } from "@/components/layout/user-account-nav";

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

  const isRTL = locale === "he";

  return (
    <div className="fixed inset-0 flex w-full overflow-hidden bg-sidebar">
      {/* Admin Sidebar - Always visible on desktop */}
      <AdminSidebar locale={locale} />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:rounded-xl md:border bg-background md:shadow-md md:p-2 md:m-3">
        {/* Header */}
        <header className="flex shrink-0 h-14 items-center border-b lg:h-[60px] px-4 gap-4">
          {/* Mobile Menu Button */}
          <MobileAdminSidebar locale={locale} />
          <div className="flex-1" />
          <div className="shrink-0">
            <UserAccountNav />
          </div>
        </header>

        <main
          className="flex min-h-0 flex-1 flex-col overflow-auto"
          dir={isRTL ? "rtl" : "ltr"}
        >
          <div className="flex w-full min-h-0 flex-1 flex-col gap-4 lg:gap-6 p-4 sm:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
