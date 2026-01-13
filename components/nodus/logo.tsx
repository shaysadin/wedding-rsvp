import Link from "next/link";
import Image from "next/image";
import { useLocale } from "next-intl";

export const LogoSVG = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Wedding rings icon */}
      <circle
        cx="9"
        cy="12"
        r="5"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <circle
        cx="15"
        cy="12"
        r="5"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      {/* Small diamond accent */}
      <path
        d="M12 6L13.5 8L12 10L10.5 8L12 6Z"
        fill="currentColor"
      />
    </svg>
  );
};

export const Logo = ({ showText = true }: { showText?: boolean }) => {
  const locale = useLocale();

  return (
    <Link href={`/${locale}`} className="flex items-center gap-2">
      <Image
        src="/logo-new.png"
        alt="Wedinex"
        width={120}
        height={36}
        className="h-8 w-auto object-contain dark:brightness-0 dark:invert"
        priority
      />
    </Link>
  );
};
