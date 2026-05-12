"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"

import { cn } from "../../lib/utils"

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer h-5 w-5 shrink-0 rounded-[4px] border-2 border-[rgba(31,30,29,0.3)] bg-white ring-offset-background focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(31,30,29,0.1)] disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-[#1F1E1D] data-[state=checked]:border-[#1F1E1D] data-[state=checked]:text-white dark:border-[rgba(115,114,108,0.4)] dark:bg-transparent",
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn("flex items-center justify-center text-current")}
    >
      <Check className="h-4 w-4" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }