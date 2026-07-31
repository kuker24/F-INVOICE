import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      "flex h-10 w-full rounded-[18px] border border-hairline bg-canvas px-3 py-2 text-sm text-ink",
      "placeholder:text-mid-gray",
      "focus-visible:border-ink/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    ref={ref}
    {...props}
  />
));
Input.displayName = "Input";
