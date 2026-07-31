import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    className={cn(
      "flex min-h-[88px] w-full rounded-[18px] border border-hairline bg-canvas px-3 py-2 text-sm text-ink",
      "placeholder:text-mid-gray",
      "focus-visible:border-ink/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    ref={ref}
    {...props}
  />
));
Textarea.displayName = "Textarea";
