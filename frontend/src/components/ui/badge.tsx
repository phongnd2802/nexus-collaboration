import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-[8px] border px-3 py-1 text-xs font-normal leading-4 transition-colors focus:outline-none focus:ring-2 focus:ring-[#1F1E1D] focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-[rgba(31,30,29,0.15)] bg-[#FAF9F5] text-[#1F1E1D] dark:bg-[#2a2a28] dark:text-[#FAF9F5] dark:border-[rgba(31,30,29,0.3)]",
        secondary:
          "border-[rgba(31,30,29,0.15)] bg-white text-[#3D3D3A] dark:bg-[#222220] dark:text-[#c0c0bb] dark:border-[rgba(31,30,29,0.3)]",
        destructive:
          "border-[rgba(224,30,90,0.3)] bg-[rgba(224,30,90,0.1)] text-[#BE123C] dark:bg-[rgba(224,30,90,0.15)] dark:text-[#f8719a]",
        success:
          "border-[rgba(34,197,94,0.3)] bg-[rgba(34,197,94,0.1)] text-[#15803d] dark:bg-[rgba(34,197,94,0.15)] dark:text-[#4ade80]",
        warning:
          "border-[rgba(210,153,34,0.3)] bg-[rgba(210,153,34,0.1)] text-[#B45309] dark:bg-[rgba(210,153,34,0.15)] dark:text-[#fbbf24]",
        outline:
          "border-[rgba(31,30,29,0.3)] bg-transparent text-[#1F1E1D] dark:text-[#FAF9F5]",
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