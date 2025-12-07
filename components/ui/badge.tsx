import * as React from "react"
import { VariantProps, cva } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-primary/10 text-primary border border-primary/20",
        secondary:
          "bg-muted text-muted-foreground border border-transparent",
        destructive:
          "bg-red-50 text-red-600 border border-red-100 dark:bg-red-950 dark:text-red-400 dark:border-red-900",
        outline:
          "bg-transparent border border-border text-foreground",
        success:
          "bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-900",
        warning:
          "bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-900",
        info:
          "bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-900",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
