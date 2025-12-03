import Link from "next/link";

export default function RsvpNotFound() {
  return (
    <html lang="he" dir="rtl">
      <body className="min-h-screen bg-background">
        <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
          <h1 className="text-4xl font-bold">404</h1>
          <p className="mt-2 text-xl text-muted-foreground">
            ההזמנה לא נמצאה
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            אנא וודאו שהקישור שקיבלתם נכון, או פנו למארגני האירוע.
          </p>
          <Link
            href="/"
            className="mt-6 rounded-md bg-primary px-4 py-2 text-primary-foreground"
          >
            חזרה לדף הבית
          </Link>
        </div>
      </body>
    </html>
  );
}
