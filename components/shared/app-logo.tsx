import Image from "next/image";
import { cn } from "@/lib/utils";

interface AppLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeConfig = {
  sm: { width: 90, height: 27 },
  md: { width: 115, height: 35 },
  lg: { width: 140, height: 42 },
  xl: { width: 175, height: 53 },
};

export function AppLogo({ size = "md", className }: AppLogoProps) {
  const { width, height } = sizeConfig[size];

  return (
    <Image
      src="/logo-new.png"
      alt="Wedinex"
      width={width}
      height={height}
      className={cn("object-contain", className)}
      style={{ width: "auto", height: "auto" }}
      priority
    />
  );
}
