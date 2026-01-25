import { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import Link from "next/link";

import { Container, Heading, SubHeading, DivideX } from "@/components/nodus";
import { Logo } from "@/components/nodus/logo";
import { getCurrentUser } from "@/lib/session";
import { getInvitationByToken } from "@/actions/invitations";
import { AcceptInviteForm } from "./accept-invite-form";

export const metadata: Metadata = {
  title: "Accept Invitation",
  description: "Accept an event collaboration invitation",
};

interface AcceptInvitePageProps {
  params: Promise<{ token: string }>;
}

export default async function AcceptInvitePage({ params }: AcceptInvitePageProps) {
  const { token } = await params;
  const user = await getCurrentUser();
  const locale = await getLocale();
  const t = await getTranslations("collaboration.acceptInvite");
  const isHebrew = locale === "he";

  // Fetch invitation details
  const result = await getInvitationByToken(token);

  if (result.error || !result.invitation) {
    // Show error page for invalid/expired invitations
    return (
      <main>
        <DivideX />
        <Container className="min-h-[calc(100vh-12rem)] py-10 md:py-20">
          <div className="mx-auto max-w-md text-center">
            <Logo />
            <Heading className="mt-6">
              {isHebrew ? "הזמנה לא תקפה" : "Invalid Invitation"}
            </Heading>
            <SubHeading as="p" className="mt-4">
              {result.error || (isHebrew ? "ההזמנה לא נמצאה או שפג תוקפה" : "This invitation was not found or has expired")}
            </SubHeading>
            <Link
              href={`/${locale}/login`}
              className="mt-8 inline-block rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {isHebrew ? "עבור להתחברות" : "Go to Login"}
            </Link>
          </div>
        </Container>
        <DivideX />
      </main>
    );
  }

  const { invitation } = result;

  return (
    <main>
      <DivideX />
      <Container className="min-h-[calc(100vh-12rem)] py-10 md:py-20">
        <div className="mx-auto max-w-md">
          <Logo />
          <Heading className="mt-6 text-center lg:text-3xl">
            {t("title")}
          </Heading>
          <SubHeading as="p" className="mt-4 text-center">
            {isHebrew
              ? `${invitation.inviterName} הזמין/ה אותך לשתף פעולה באירוע "${invitation.eventTitle}"`
              : `${invitation.inviterName} invited you to collaborate on "${invitation.eventTitle}"`}
          </SubHeading>

          <div className="mt-8">
            <AcceptInviteForm
              token={token}
              invitation={invitation}
              isLoggedIn={!!user}
              userEmail={user?.email || null}
              locale={locale}
            />
          </div>

          {!user && (
            <div className="mt-6 text-center">
              <span className="text-sm text-gray-600 dark:text-neutral-400">
                {isHebrew ? "כבר יש לך חשבון? " : "Already have an account? "}
              </span>
              <Link
                href={`/${locale}/login?callbackUrl=${encodeURIComponent(`/${locale}/accept-invite/${token}`)}`}
                className="text-brand text-sm font-medium hover:underline"
              >
                {isHebrew ? "התחבר" : "Sign in"}
              </Link>
            </div>
          )}
        </div>
      </Container>
      <DivideX />
    </main>
  );
}
