import { cn } from "@/lib/utils";
import { Icons } from "@/components/shared/icons";

interface AppLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "size-5",
  md: "size-6",
  lg: "size-8",
};

export function AppLogo({ size = "md", className }: AppLogoProps) {
  return (
    <Icons.logo className={cn(sizeClasses[size], className)} />
  );
}
