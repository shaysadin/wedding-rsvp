"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { signOut, useSession } from "next-auth/react";

import { Dropdown } from "./dropdown";
import { DropdownItem } from "./dropdown-item";

// Helper to check if user has admin role
function isAdmin(user: any): boolean {
  if (!user) return false;
  if (user.roles?.includes("ROLE_PLATFORM_OWNER")) return true;
  if (user.role === "ROLE_PLATFORM_OWNER") return true;
  return false;
}

export function UserDropdown() {
  const { data: session } = useSession();
  const user = session?.user;
  const pathname = usePathname();
  const t = useTranslations();
  const [isOpen, setIsOpen] = useState(false);

  const locale = pathname?.split("/")[1] || "he";

  function toggleDropdown(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  if (!user) {
    return (
      <div className="h-11 w-11 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
    );
  }

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className="flex items-center text-gray-700 dark:text-gray-400 dropdown-toggle"
      >
        <span className="overflow-hidden rounded-full h-11 w-11 ltr:mr-3 rtl:ml-3">
          {user.image ? (
            <Image
              width={44}
              height={44}
              src={user.image}
              alt={user.name || "User"}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400">
              <span className="text-sm font-semibold">
                {user.name?.charAt(0)?.toUpperCase() || "U"}
              </span>
            </div>
          )}
        </span>

        <span className="hidden md:block ltr:mr-1 rtl:ml-1 font-medium text-theme-sm">
          {user.name?.split(" ")[0] || "User"}
        </span>

        <svg
          className={`hidden md:block stroke-gray-500 dark:stroke-gray-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          width="18"
          height="20"
          viewBox="0 0 18 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4.3125 8.65625L9 13.3437L13.6875 8.65625"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute ltr:right-0 rtl:left-0 mt-[17px] flex w-[260px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900 z-[99999]"
      >
        <div>
          <span className="block font-medium text-gray-700 text-theme-sm dark:text-gray-400">
            {user.name}
          </span>
          <span className="mt-0.5 block text-theme-xs text-gray-500 dark:text-gray-400">
            {user.email}
          </span>
        </div>

        <ul className="flex flex-col gap-1 pt-4 pb-3 border-b border-gray-200 dark:border-gray-800">
          {isAdmin(user) && (
            <li>
              <DropdownItem
                onItemClick={closeDropdown}
                tag="a"
                href={pathname?.includes("/admin") ? `/${locale}/dashboard` : `/${locale}/admin`}
                className="flex items-center gap-3 px-3 py-2 font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
              >
                <svg
                  className="fill-gray-500 group-hover:fill-gray-700 dark:fill-gray-400 dark:group-hover:fill-gray-300"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M9.53033 4.46967C9.82322 4.76256 9.82322 5.23744 9.53033 5.53033L4.81066 10.25H16.5C18.5711 10.25 20.25 11.9289 20.25 14V19C20.25 19.4142 19.9142 19.75 19.5 19.75C19.0858 19.75 18.75 19.4142 18.75 19V14C18.75 12.7574 17.7426 11.75 16.5 11.75H4.81066L9.53033 16.4697C9.82322 16.7626 9.82322 17.2374 9.53033 17.5303C9.23744 17.8232 8.76256 17.8232 8.46967 17.5303L2.46967 11.5303C2.17678 11.2374 2.17678 10.7626 2.46967 10.4697L8.46967 4.46967C8.76256 4.17678 9.23744 4.17678 9.53033 4.46967Z"
                    fill=""
                  />
                </svg>
                {pathname?.includes("/admin")
                  ? t("common.switchToDashboard")
                  : t("common.switchToAdmin")}
              </DropdownItem>
            </li>
          )}
          <li>
            <DropdownItem
              onItemClick={closeDropdown}
              tag="a"
              href={`/${locale}/dashboard/settings`}
              className="flex items-center gap-3 px-3 py-2 font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              <svg
                className="fill-gray-500 group-hover:fill-gray-700 dark:fill-gray-400 dark:group-hover:fill-gray-300"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 3.5C7.30558 3.5 3.5 7.30558 3.5 12C3.5 14.1526 4.3002 16.1184 5.61936 17.616C6.17279 15.3096 8.24852 13.5955 10.7246 13.5955H13.2746C15.7509 13.5955 17.8268 15.31 18.38 17.6167C19.6996 16.119 20.5 14.153 20.5 12C20.5 7.30558 16.6944 3.5 12 3.5ZM17.0246 18.8566V18.8455C17.0246 16.7744 15.3457 15.0955 13.2746 15.0955H10.7246C8.65354 15.0955 6.97461 16.7744 6.97461 18.8455V18.856C8.38223 19.8895 10.1198 20.5 12 20.5C13.8798 20.5 15.6171 19.8898 17.0246 18.8566ZM2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12ZM11.9991 7.25C10.8847 7.25 9.98126 8.15342 9.98126 9.26784C9.98126 10.3823 10.8847 11.2857 11.9991 11.2857C13.1135 11.2857 14.0169 10.3823 14.0169 9.26784C14.0169 8.15342 13.1135 7.25 11.9991 7.25ZM8.48126 9.26784C8.48126 7.32499 10.0563 5.75 11.9991 5.75C13.9419 5.75 15.5169 7.32499 15.5169 9.26784C15.5169 11.2107 13.9419 12.7857 11.9991 12.7857C10.0563 12.7857 8.48126 11.2107 8.48126 9.26784Z"
                  fill=""
                />
              </svg>
              {t("common.settings")}
            </DropdownItem>
          </li>
          <li>
            <DropdownItem
              onItemClick={closeDropdown}
              tag="a"
              href={`/${locale}/dashboard/billing`}
              className="flex items-center gap-3 px-3 py-2 font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              <svg
                className="fill-gray-500 group-hover:fill-gray-700 dark:fill-gray-400 dark:group-hover:fill-gray-300"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M3.5 5.5C3.5 4.39543 4.39543 3.5 5.5 3.5H18.5C19.6046 3.5 20.5 4.39543 20.5 5.5V18.5C20.5 19.6046 19.6046 20.5 18.5 20.5H5.5C4.39543 20.5 3.5 19.6046 3.5 18.5V5.5ZM5.5 2C3.567 2 2 3.567 2 5.5V18.5C2 20.433 3.567 22 5.5 22H18.5C20.433 22 22 20.433 22 18.5V5.5C22 3.567 20.433 2 18.5 2H5.5ZM6.75 9C6.75 8.58579 7.08579 8.25 7.5 8.25H16.5C16.9142 8.25 17.25 8.58579 17.25 9C17.25 9.41421 16.9142 9.75 16.5 9.75H7.5C7.08579 9.75 6.75 9.41421 6.75 9ZM7.5 11.75C7.08579 11.75 6.75 12.0858 6.75 12.5C6.75 12.9142 7.08579 13.25 7.5 13.25H12C12.4142 13.25 12.75 12.9142 12.75 12.5C12.75 12.0858 12.4142 11.75 12 11.75H7.5Z"
                  fill=""
                />
              </svg>
              {t("navigation.billing")}
            </DropdownItem>
          </li>
          <li>
            <DropdownItem
              onItemClick={closeDropdown}
              tag="a"
              href={`/${locale}/dashboard/archives`}
              className="flex items-center gap-3 px-3 py-2 font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              <svg
                className="fill-gray-500 group-hover:fill-gray-700 dark:fill-gray-400 dark:group-hover:fill-gray-300"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M3.5 5.5C3.5 4.67157 4.17157 4 5 4H19C19.8284 4 20.5 4.67157 20.5 5.5V7.5C20.5 8.32843 19.8284 9 19 9H5C4.17157 9 3.5 8.32843 3.5 7.5V5.5ZM5 5.5H19V7.5H5V5.5ZM4.75 10.5C4.33579 10.5 4 10.8358 4 11.25V18.5C4 19.3284 4.67157 20 5.5 20H18.5C19.3284 20 20 19.3284 20 18.5V11.25C20 10.8358 19.6642 10.5 19.25 10.5H4.75ZM5.5 18.5V12H18.5V18.5H5.5ZM9.25 14.75C9.25 14.3358 9.58579 14 10 14H14C14.4142 14 14.75 14.3358 14.75 14.75C14.75 15.1642 14.4142 15.5 14 15.5H10C9.58579 15.5 9.25 15.1642 9.25 14.75Z"
                  fill=""
                />
              </svg>
              {t("navigation.archives")}
            </DropdownItem>
          </li>
        </ul>

        <button
          onClick={() => {
            closeDropdown();
            signOut({
              callbackUrl: `${window.location.origin}/${locale}`,
            });
          }}
          className="flex items-center gap-3 px-3 py-2 mt-3 font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300 w-full"
        >
          <svg
            className="fill-gray-500 group-hover:fill-gray-700 dark:group-hover:fill-gray-300"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M15.1007 19.247C14.6865 19.247 14.3507 18.9112 14.3507 18.497L14.3507 14.245H12.8507V18.497C12.8507 19.7396 13.8581 20.747 15.1007 20.747H18.5007C19.7434 20.747 20.7507 19.7396 20.7507 18.497L20.7507 5.49609C20.7507 4.25345 19.7433 3.24609 18.5007 3.24609H15.1007C13.8581 3.24609 12.8507 4.25345 12.8507 5.49609V9.74501L14.3507 9.74501V5.49609C14.3507 5.08188 14.6865 4.74609 15.1007 4.74609L18.5007 4.74609C18.9149 4.74609 19.2507 5.08188 19.2507 5.49609L19.2507 18.497C19.2507 18.9112 18.9149 19.247 18.5007 19.247H15.1007ZM3.25073 11.9984C3.25073 12.2144 3.34204 12.4091 3.48817 12.546L8.09483 17.1556C8.38763 17.4485 8.86251 17.4487 9.15549 17.1559C9.44848 16.8631 9.44863 16.3882 9.15583 16.0952L5.81116 12.7484L16.0007 12.7484C16.4149 12.7484 16.7507 12.4127 16.7507 11.9984C16.7507 11.5842 16.4149 11.2484 16.0007 11.2484L5.81528 11.2484L9.15585 7.90554C9.44864 7.61255 9.44847 7.13767 9.15547 6.84488C8.86248 6.55209 8.3876 6.55226 8.09481 6.84525L3.52309 11.4202C3.35673 11.5577 3.25073 11.7657 3.25073 11.9984Z"
              fill=""
            />
          </svg>
          {t("common.logout")}
        </button>
      </Dropdown>
    </div>
  );
}
