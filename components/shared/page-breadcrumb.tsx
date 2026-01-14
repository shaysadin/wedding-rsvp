"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageBreadcrumbProps {
  pageTitle: string;
  items?: BreadcrumbItem[];
}

export function PageBreadcrumb({ pageTitle, items }: PageBreadcrumbProps) {
  const t = useTranslations("navigation");
  const params = useParams();
  const locale = params?.locale as string || "he";

  // Default to Home if no items provided
  const breadcrumbItems: BreadcrumbItem[] = items || [
    { label: t("home"), href: `/${locale}/dashboard` },
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
        {pageTitle}
      </h2>
      <nav>
        <ol className="flex items-center gap-1.5">
          {breadcrumbItems.map((item, index) => (
            <li key={index}>
              {item.href ? (
                <Link
                  className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                  href={item.href}
                >
                  {item.label}
                  <svg
                    className="stroke-current rtl:rotate-180"
                    width="17"
                    height="16"
                    viewBox="0 0 17 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M6.0765 12.667L10.2432 8.50033L6.0765 4.33366"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Link>
              ) : (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {item.label}
                </span>
              )}
            </li>
          ))}
          <li className="text-sm font-medium text-gray-800 dark:text-white/90">
            {pageTitle}
          </li>
        </ol>
      </nav>
    </div>
  );
}
