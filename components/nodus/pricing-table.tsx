"use client";

import React, { useState } from "react";
import { Container } from "@/components/nodus/container";
import { pricingTable, tiers, TierName } from "@/components/nodus/constants/pricing";
import { cn } from "@/lib/utils";
import { Button } from "@/components/nodus/button";
import { SlidingNumber } from "@/components/nodus/animations/sliding-number";
import Link from "next/link";
import { useTranslations } from "next-intl";

export const PricingTable = () => {
  const t = useTranslations("Marketing.pricing");
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");

  const orderedTierIds: TierName[] = [TierName.BASIC, TierName.ADVANCED, TierName.PREMIUM];

  return (
    <section>
      <Container className="border-divide border-x">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="">
              <tr className="border-divide divide-divide divide-x border-b">
                <th className="min-w-[220px] px-4 pt-12 pb-8 align-bottom text-sm font-medium text-gray-600 dark:text-neutral-200">
                  <div className="mb-2 text-sm font-normal text-gray-600 dark:text-neutral-200">
                    {t("monthly")} / {t("yearly")}
                  </div>
                  <div className="inline-flex rounded-md bg-gray-100 p-1 dark:bg-neutral-800">
                    {[
                      { label: t("monthly"), value: "monthly" },
                      { label: t("yearly"), value: "yearly" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() =>
                          setCycle(opt.value as "monthly" | "yearly")
                        }
                        className={cn(
                          "relative z-10 rounded-md px-3 py-1 text-sm text-gray-800 dark:text-white",
                          cycle === opt.value &&
                            "shadow-aceternity bg-white dark:bg-neutral-900 dark:text-white",
                        )}
                        aria-pressed={
                          cycle === (opt.value as "monthly" | "yearly")
                        }
                        type="button"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </th>
                {orderedTierIds.map((tierId) => {
                  const tier = tiers.find((t) => t.id === tierId);
                  if (!tier) return null;
                  return (
                    <th
                      key={`hdr-${tierId}`}
                      className="min-w-[220px] px-4 pt-12 pb-8 align-bottom"
                    >
                      <div className="text-charcoal-700 text-lg font-medium dark:text-neutral-100">
                        {t(`tiers.${tierId}.title`)}
                      </div>
                      <div className="flex items-center text-sm font-normal text-gray-600 dark:text-neutral-300" dir="ltr">
                        $<SlidingNumber value={cycle === "monthly" ? tier.monthly : tier.yearly} />
                        {cycle === "monthly" ? t("perMonth") : t("perYear")}
                      </div>
                      <Button
                        as={Link}
                        href={tier.ctaLink}
                        className="mt-4 w-full"
                        variant="secondary"
                      >
                        {t("getStarted")}
                      </Button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="">
              {pricingTable.map((row, index) => (
                <tr
                  key={row.titleKey}
                  className={cn(
                    "border-divide divide-divide divide-x border-b",
                    index % 2 === 0 && "bg-gray-50 dark:bg-neutral-800",
                  )}
                >
                  <td className="text-charcoal-700 flex px-4 py-6 text-center text-sm dark:text-neutral-100">
                    {t(row.titleKey)}
                  </td>
                  {orderedTierIds.map((tierId) => {
                    const tierVal = row.tiers.find(
                      (t) => t.id === tierId,
                    );
                    const displayValue = tierVal && 'valueKey' in tierVal && tierVal.valueKey
                      ? t(tierVal.valueKey)
                      : tierVal?.value;
                    return (
                      <td
                        key={`${row.titleKey}-${tierId}`}
                        className="text-charcoal-700 mx-auto px-4 py-6 text-center text-sm dark:text-neutral-100"
                      >
                        {displayValue}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Container>
    </section>
  );
};

export default PricingTable;
