import { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Icons } from "@/components/shared/icons";

interface CancelPageProps {
  searchParams: Promise<{ lang?: string; slug?: string }>;
}

export const metadata: Metadata = {
  title: "Payment Cancelled",
  description: "Your gift payment was cancelled",
};

export default async function GiftCancelPage({ searchParams }: CancelPageProps) {
  const resolvedSearchParams = await searchParams;
  const locale = resolvedSearchParams.lang || "he";
  const isRTL = locale === "he";
  const guestSlug = resolvedSearchParams.slug;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 rounded-full bg-amber-100 p-4 dark:bg-amber-900">
            <Icons.x className="h-12 w-12 text-amber-600 dark:text-amber-400" />
          </div>
          <CardTitle className="text-2xl">
            {isRTL ? "התשלום בוטל" : "Payment Cancelled"}
          </CardTitle>
          <CardDescription className="text-base">
            {isRTL
              ? "התשלום בוטל ולא בוצע חיוב."
              : "The payment was cancelled and you were not charged."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <p className="text-sm text-muted-foreground">
            {isRTL
              ? "אם ברצונכם לנסות שוב, לחצו על הכפתור למטה."
              : "If you want to try again, click the button below."}
          </p>
        </CardContent>

        <CardFooter className="flex justify-center gap-3">
          {guestSlug && (
            <Button asChild>
              <Link href={`/gift/${guestSlug}?lang=${locale}`}>
                {isRTL ? "נסו שוב" : "Try Again"}
              </Link>
            </Button>
          )}
          <Button asChild variant="outline">
            <Link href="/">
              {isRTL ? "חזרה לדף הבית" : "Back to Home"}
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
