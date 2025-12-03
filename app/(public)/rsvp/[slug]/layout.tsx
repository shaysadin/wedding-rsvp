import "@/styles/globals.css";

import { fontGeist, fontHeading, fontSans, fontUrban } from "@/assets/fonts";
import { cn } from "@/lib/utils";

interface RsvpLayoutProps {
  children: React.ReactNode;
}

export default function RsvpLayout({ children }: RsvpLayoutProps) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <head />
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable,
          fontUrban.variable,
          fontHeading.variable,
          fontGeist.variable,
        )}
      >
        {children}
      </body>
    </html>
  );
}
