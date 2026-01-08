"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

import { HeaderSection } from "@/components/shared/header-section";

const reviewKeys = ["review1", "review2", "review3", "review4", "review5", "review6", "review7"] as const;
const reviewImages = [
  "https://randomuser.me/api/portraits/women/1.jpg",
  "https://randomuser.me/api/portraits/women/2.jpg",
  "https://randomuser.me/api/portraits/men/3.jpg",
  "https://randomuser.me/api/portraits/women/4.jpg",
  "https://randomuser.me/api/portraits/men/5.jpg",
  "https://randomuser.me/api/portraits/men/6.jpg",
  "https://randomuser.me/api/portraits/women/7.jpg",
];

export default function Testimonials() {
  const t = useTranslations("marketing.testimonials");

  return (
    <section>
      <div className="container flex max-w-7xl flex-col gap-10 py-32 sm:gap-y-16">
        <HeaderSection
          label={t("label")}
          title={t("title")}
          subtitle={t("subtitle")}
        />

        <div className="column-1 gap-5 space-y-5 md:columns-2 lg:columns-3 ">
          {reviewKeys.map((key, index) => (
            <div className="break-inside-avoid" key={key}>
              <div className="relative rounded-xl border bg-muted/25">
                <div className="flex flex-col px-4 py-5 sm:p-6">
                  <div>
                    <div className="relative mb-4 flex items-center gap-3">
                      <span className="relative inline-flex size-10 shrink-0 items-center justify-center rounded-full text-base">
                        <Image
                          width={100}
                          height={100}
                          className="size-full rounded-full border"
                          style={{ width: "auto", height: "auto" }}
                          src={reviewImages[index]}
                          alt={t(`reviews.${key}.name`)}
                        />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {t(`reviews.${key}.name`)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t(`reviews.${key}.job`)}
                        </p>
                      </div>
                    </div>
                    <q className="text-muted-foreground">{t(`reviews.${key}.review`)}</q>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
