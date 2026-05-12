import * as React from "react"

import { cn } from "../../lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-[44px] w-full rounded-[9.6px] border bg-white px-4 py-3 text-base font-[430] leading-[22.4px] text-[#141413] placeholder:text-[rgba(61,61,58,0.6)] border-[rgba(31,30,29,0.15)] hover:border-[rgba(31,30,29,0.3)] focus-visible:outline-none focus-visible:border-[#1F1E1D] focus-visible:shadow-[0_0_0_3px_rgba(31,30,29,0.1)] disabled:cursor-not-allowed disabled:bg-[#FAF9F5] disabled:text-[#73726C] disabled:border-[rgba(31,30,29,0.15)] file:border-0 file:bg-transparent file:text-sm file:font-medium dark:bg-[#1c1c1a] dark:text-[#FAF9F5] dark:border-[rgba(31,30,29,0.3)] dark:placeholder:text-[rgba(115,114,108,0.6)]",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }