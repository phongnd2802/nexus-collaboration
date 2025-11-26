"use client";

import React from "react";

import { cn } from "@/lib/utils";

interface CustomToggleProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}

export function CustomToggle({
  id,
  checked,
  onChange,
  disabled = false,
  size = "md",
}: CustomToggleProps) {
  const sizeClasses = {
    sm: {
      button: "h-5 w-9",
      thumb: "h-3 w-3",
      translate: "translate-x-4",
    },
    md: {
      button: "h-6 w-12",
      thumb: "h-4 w-4",
      translate: "translate-x-6",
    },
    lg: {
      button: "h-7 w-14",
      thumb: "h-5 w-5",
      translate: "translate-x-7",
    },
  };

  const { button, thumb, translate } = sizeClasses[size];

  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-border bg-secondary-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-main" : "bg-secondary-background",
        button,
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none block rounded-full bg-white border-2 border-border ring-0 transition-transform",
          thumb,
          checked ? translate : "translate-x-1"
        )}
      />
    </button>
  );
}
