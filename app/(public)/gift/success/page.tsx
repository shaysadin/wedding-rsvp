import { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Icons } from "@/components/shared/icons";

interface SuccessPageProps {
  searchParams: Promise<{ lang?: string }>;
}

export const metadata: Metadata = {
  title: "Payment Successful",
  description: "Your gift payment was processed successfully",
};

export default async function GiftSuccessPage({ searchParams }: SuccessPageProps) {
  const resolvedSearchParams = await searchParams;
  const locale = resolvedSearchParams.lang || "he";
  const isRTL = locale === "he";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 rounded-full bg-green-100 p-4 dark:bg-green-900">
            <Icons.check className="h-12 w-12 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl">
            {isRTL ? "התשלום בוצע בהצלחה!" : "Payment Successful!"}
          </CardTitle>
          <CardDescription className="text-base">
            {isRTL
              ? "תודה על המתנה! הזוג יקבלו הודעה על המתנה שלכם."
              : "Thank you for your gift! The couple will be notified of your gift."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="bg-muted rounded-lg p-4">
            <p className="text-sm text-muted-foreground">
              {isRTL
                ? "אישור על התשלום נשלח לכתובת המייל שלכם."
                : "A confirmation has been sent to your email address."}
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex justify-center">
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
