import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";

import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { ProtectedHeader } from "@/components/layout/protected-header";

// Force dynamic rendering to avoid caching issues with role switching
export const dynamic = "force-dynamic";

interface ProtectedLayoutProps {
  children: React.ReactNode;
}

export default async function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const user = await getCurrentUser();
  const locale = await getLocale();

  if (!user) redirect(`/${locale}/login`);

  // Get user data including email verification status and roles
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { emailVerified: true, role: true, accounts: true },
  });

  // If user has no OAuth accounts and email is not verified, block access
  const hasOAuthAccount = dbUser?.accounts && dbUser.accounts.length > 0;
  if (!hasOAuthAccount && !dbUser?.emailVerified) {
    redirect(`/${locale}/login?error=EmailNotVerified`);
  }

  const isRTL = locale === "he";

  // Layout for all protected pages
  // ProtectedHeader client component handles showing/hiding based on route
  return (
    <div className="fixed inset-0 flex w-full overflow-hidden bg-sidebar">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:rounded-xl md:border bg-background md:shadow-md md:p-2 md:m-3">
        <ProtectedHeader />

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
