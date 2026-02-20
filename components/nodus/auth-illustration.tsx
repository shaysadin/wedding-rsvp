"use client";
import React from "react";
import MeshGradient from "@/components/nodus/mesh-gradient";
import { useTranslations } from "next-intl";

export const AuthIllustration = () => {
  const t = useTranslations("auth.illustration");

  return (
    <div className="relative flex min-h-80 flex-col items-start justify-end overflow-hidden rounded-2xl bg-black p-4 md:p-8">
      <div className="relative z-40 mb-2 flex items-center gap-2">
        <p className="rounded-md bg-black/50 px-2 py-1 text-xs text-white">
          {t("badge1")}
        </p>
        <p className="rounded-md bg-black/50 px-2 py-1 text-xs text-white">
          {t("badge2")}
        </p>
      </div>
      <div className="relative z-40 max-w-sm rounded-xl bg-black/50 p-4 backdrop-blur-sm">
        <h2 className="text-white">
          {t("quote")}
        </h2>
        <p className="mt-4 text-sm text-white/50">{t("name")}</p>
        <p className="mt-1 text-sm text-white/50">
          {t("role")}
        </p>
      </div>

      <div className="absolute -top-48 -right-40 z-20 grid rotate-45 transform grid-cols-4 gap-32 mask-r-from-50%">
        <div className="size-40 shrink-0 rounded-3xl bg-neutral-900 shadow-[0px_2px_0px_0px_var(--color-neutral-600)_inset]"></div>
        <div className="size-40 shrink-0 rounded-3xl bg-neutral-900 shadow-[0px_2px_0px_0px_var(--color-neutral-600)_inset]"></div>
        <div className="size-40 shrink-0 rounded-3xl bg-neutral-900 shadow-[0px_2px_0px_0px_var(--color-neutral-600)_inset]"></div>
        <div className="size-40 shrink-0 rounded-3xl bg-neutral-900 shadow-[0px_2px_0px_0px_var(--color-neutral-600)_inset]"></div>
      </div>

      <div className="absolute -top-0 -right-10 z-20 grid rotate-45 transform grid-cols-4 gap-32 mask-r-from-50% opacity-50">
        <div className="size-40 shrink-0 rounded-3xl bg-neutral-900 shadow-[0px_2px_0px_0px_var(--color-neutral-600)_inset]"></div>
        <div className="size-40 shrink-0 rounded-3xl bg-neutral-900 shadow-[0px_2px_0px_0px_var(--color-neutral-600)_inset]"></div>
        <div className="size-40 shrink-0 rounded-3xl bg-neutral-900 shadow-[0px_2px_0px_0px_var(--color-neutral-600)_inset]"></div>
        <div className="size-40 shrink-0 rounded-3xl bg-neutral-900 shadow-[0px_2px_0px_0px_var(--color-neutral-600)_inset]"></div>
      </div>
      <MeshGradient className="absolute inset-0 z-30 h-full w-200 mask-t-from-50% blur-3xl" />
    </div>
  );
};
