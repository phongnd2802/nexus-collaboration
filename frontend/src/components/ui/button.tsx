import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-[15px] font-normal leading-[22.5px] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F1E1D] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[#1F1E1D] text-white shadow-[rgba(0,0,0,0.04)_0px_4px_20px_0px] hover:bg-[#0A0A0A] hover:shadow-[rgba(0,0,0,0.08)_0px_8px_28px_0px] active:bg-[#000000] active:scale-[0.98] disabled:bg-[#3D3D3A] disabled:text-[#73726C]",
        destructive:
          "bg-[#E01E5A] text-white hover:bg-[#c71a4e] shadow-[rgba(0,0,0,0.04)_0px_4px_20px_0px]",
        outline:
          "border bg-white text-[#1F1E1D] border-[rgba(31,30,29,0.3)] hover:bg-[#FAF9F5] hover:border-[rgba(31,30,29,0.6)] active:bg-[#F0F0ED] active:border-[rgba(31,30,29,0.8)] disabled:bg-[#FAF9F5] disabled:text-[#73726C] disabled:border-[rgba(31,30,29,0.15)]",
        secondary:
          "bg-white text-[#1F1E1D] border border-[rgba(31,30,29,0.3)] hover:bg-[#FAF9F5] hover:border-[rgba(31,30,29,0.6)] active:bg-[#F0F0ED] active:border-[rgba(31,30,29,0.8)] disabled:bg-[#FAF9F5] disabled:text-[#73726C] disabled:border-[rgba(31,30,29,0.15)]",
        ghost:
          "bg-transparent text-[#1F1E1D] border border-[rgba(31,30,29,0.3)] hover:bg-[rgba(31,30,29,0.04)] hover:border-[rgba(31,30,29,0.6)] active:bg-[rgba(31,30,29,0.08)] disabled:text-[#73726C] disabled:border-[rgba(31,30,29,0.15)]",
        link: "text-[#D97757] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-[44px] px-6 py-3 rounded-[9.6px]",
        sm: "h-9 px-4 py-2 rounded-[8px] text-sm",
        lg: "h-[52px] px-8 py-4 rounded-[9.6px] text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }