"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { Icons } from "@/components/shared/icons";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";

interface InfoLandingProps {
  sectionKey: "section1" | "section2";
  image: string;
  reverse?: boolean;
}

const sectionIcons = {
  section1: ["messageCircle", "chart", "palette"] as const,
  section2: ["fileText", "bell", "download"] as const,
};

export default function InfoLanding({
  sectionKey,
  image,
  reverse = false,
}: InfoLandingProps) {
  const t = useTranslations(`marketing.info.${sectionKey}`);
  const icons = sectionIcons[sectionKey];

  return (
    <div className="py-10 sm:py-20">
      <MaxWidthWrapper className="grid gap-10 px-2.5 lg:grid-cols-2 lg:items-center lg:px-7">
        <div className={cn(reverse ? "lg:order-2" : "lg:order-1")}>
          <h2 className="font-heading text-2xl text-foreground md:text-4xl lg:text-[40px]">
            {t("title")}
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            {t("description")}
          </p>
          <dl className="mt-6 space-y-4 leading-7">
            {[1, 2, 3].map((num, index) => {
              const Icon = Icons[icons[index] || "arrowRight"];
              return (
                <div className="relative pl-8" key={num}>
                  <dt className="font-semibold">
                    <Icon className="absolute left-0 top-1 size-5 stroke-purple-700" />
                    <span>{t(`item${num}Title`)}</span>
                  </dt>
                  <dd className="text-sm text-muted-foreground">
                    {t(`item${num}Description`)}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
        <div
          className={cn(
            "overflow-hidden rounded-xl border lg:-m-4",
            reverse ? "order-1" : "order-2",
          )}
        >
          <div className="aspect-video">
            <Image
              className="size-full object-cover object-center"
              style={{ width: "auto", height: "auto" }}
              src={image}
              alt={t("title")}
              width={1000}
              height={500}
              priority={true}
            />
          </div>
        </div>
      </MaxWidthWrapper>
    </div>
  );
}
