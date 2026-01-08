"use client";

import { useLocale } from "next-intl";
import { useMemo } from "react";

/**
 * Hook to get the current text direction based on locale.
 * Use this for the few remaining cases where JavaScript-level direction awareness is needed.
 *
 * For most cases, prefer using CSS logical properties (ms-, me-, ps-, pe-, start-, end-)
 * which automatically respond to the dir attribute on the HTML element.
 */
export function useDirection() {
  const locale = useLocale();

  return useMemo(
    () => ({
      dir: locale === "he" ? ("rtl" as const) : ("ltr" as const),
      isRTL: locale === "he",
    }),
    [locale]
  );
}
