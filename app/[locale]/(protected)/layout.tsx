import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";

import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { SidebarProvider } from "@/contexts/sidebar-context";

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

  // Dashboard and events routes have their own layouts with sidebars
  // Wrap with SidebarProvider for shared sidebar state across all protected routes
  return <SidebarProvider>{children}</SidebarProvider>;
}
