import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/shared/icons";
import { UserAccountNav } from "@/components/layout/user-account-nav";

export default async function HomePage() {
  const t = await getTranslations();
  const locale = await getLocale();
  const session = await auth();

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between">
          <Link href={`/${locale}`} className="flex items-center gap-2 font-bold">
            <Icons.logo className="h-6 w-6" />
            <span>{t("common.appName")}</span>
          </Link>
          <nav className="flex items-center gap-4">
            {session?.user ? (
              <>
                <Button asChild>
                  <Link href={`/${locale}/dashboard`}>
                    {t("common.dashboard")}
                  </Link>
                </Button>
                <UserAccountNav user={session.user} />
              </>
            ) : (
              <>
                <Button asChild variant="ghost">
                  <Link href={`/${locale}/login`}>
                    {t("common.login")}
                  </Link>
                </Button>
                <Button asChild>
                  <Link href={`/${locale}/register`}>
                    {t("common.register")}
                  </Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="container flex flex-col items-center justify-center gap-6 py-24 text-center md:py-32">
          <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl">
            {locale === "he"
              ? "נהלו את ההזמנות לחתונה שלכם בקלות"
              : "Manage Your Wedding Invitations with Ease"}
          </h1>
          <p className="max-w-[600px] text-lg text-muted-foreground md:text-xl">
            {locale === "he"
              ? "צרו אירועים, הזמינו אורחים, ועקבו אחר אישורי הגעה - הכל במקום אחד פשוט ונוח."
              : "Create events, invite guests, and track RSVPs - all in one simple and convenient place."}
          </p>
          <div className="flex gap-4">
            <Button asChild size="lg">
              <Link href={`/${locale}/register`}>
                {locale === "he" ? "התחילו עכשיו" : "Get Started"}
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href={`/${locale}/login`}>
                {t("common.login")}
              </Link>
            </Button>
          </div>
        </section>

        {/* Features Section */}
        <section className="container py-16">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="flex flex-col items-center gap-4 rounded-lg border p-6 text-center">
              <Icons.calendar className="h-12 w-12 text-primary" />
              <h3 className="text-xl font-semibold">
                {locale === "he" ? "ניהול אירועים" : "Event Management"}
              </h3>
              <p className="text-muted-foreground">
                {locale === "he"
                  ? "צרו ונהלו אירועי חתונה מרובים בקלות"
                  : "Create and manage multiple wedding events easily"}
              </p>
            </div>
            <div className="flex flex-col items-center gap-4 rounded-lg border p-6 text-center">
              <Icons.users className="h-12 w-12 text-primary" />
              <h3 className="text-xl font-semibold">
                {locale === "he" ? "ניהול אורחים" : "Guest Management"}
              </h3>
              <p className="text-muted-foreground">
                {locale === "he"
                  ? "ייבאו אורחים מאקסל ועקבו אחר סטטוס אישורים"
                  : "Import guests from Excel and track RSVP status"}
              </p>
            </div>
            <div className="flex flex-col items-center gap-4 rounded-lg border p-6 text-center">
              <Icons.send className="h-12 w-12 text-primary" />
              <h3 className="text-xl font-semibold">
                {locale === "he" ? "שליחת הזמנות" : "Send Invitations"}
              </h3>
              <p className="text-muted-foreground">
                {locale === "he"
                  ? "שלחו הזמנות ותזכורות באופן אוטומטי"
                  : "Send invitations and reminders automatically"}
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-6">
        <div className="container flex items-center justify-between text-sm text-muted-foreground">
          <p>© 2024 {t("common.appName")}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
