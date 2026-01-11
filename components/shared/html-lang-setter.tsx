"use client";

import { useEffect } from "react";

interface HtmlLangSetterProps {
  lang: string;
  dir: "ltr" | "rtl";
}

export function HtmlLangSetter({ lang, dir }: HtmlLangSetterProps) {
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  return null;
}
