import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-hairline disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-ink text-[#fafafa] hover:bg-ink-soft",
        secondary: "bg-canvas text-ink hover:bg-hairline/60",
        outline: "border border-hairline bg-transparent text-ink hover:bg-canvas",
        ghost: "bg-transparent text-ink hover:bg-canvas",
        destructive: "bg-transparent text-ember hover:bg-ember/10",
      },
      size: {
        default: "h-9 rounded-[18px] px-3",
        sm: "h-8 rounded-[18px] px-3 text-xs",
        lg: "h-10 rounded-[18px] px-4",
        icon: "h-9 w-9 rounded-[18px]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  ),
);
Button.displayName = "Button";
