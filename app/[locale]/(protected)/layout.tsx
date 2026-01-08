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

  // Layout for all protected pages
  // ProtectedHeader client component handles showing/hiding based on route
  return (
    <div className="fixed inset-0 flex w-full overflow-hidden bg-background">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <ProtectedHeader />

        <main className="flex min-h-0 flex-1 flex-col overflow-auto">
          <div className="flex w-full min-h-0 flex-1 flex-col gap-4 lg:gap-6 py-4 px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
