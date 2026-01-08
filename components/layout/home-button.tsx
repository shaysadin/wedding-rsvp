"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home } from "lucide-react";

import { Button } from "@/components/ui/button";

export function HomeButton() {
  const pathname = usePathname();

  // Extract locale from pathname
  const locale = pathname?.split("/")[1] || "he";

  // Check if we're on the dashboard lobby page
  const isDashboardLobby = pathname?.match(/^\/[a-z]{2}\/dashboard\/?$/) !== null;

  // Don't show on dashboard lobby
  if (isDashboardLobby) {
    return null;
  }

  return (
    <Button variant="ghost" size="icon" asChild className="size-9 shrink-0">
      <Link href={`/${locale}/dashboard`}>
        <Home className="size-5" />
        <span className="sr-only">Dashboard</span>
      </Link>
    </Button>
  );
}
