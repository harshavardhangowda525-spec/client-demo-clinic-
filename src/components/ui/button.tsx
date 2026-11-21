import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-ink text-white shadow-[0_8px_24px_-8px_rgb(11_21_48/.55)] hover:bg-ink-2 hover:shadow-[0_12px_32px_-8px_rgb(19_153_143/.55)] hover:-translate-y-px",
        teal: "bg-teal-600 text-white shadow-[0_8px_24px_-10px_rgb(13_124_117/.7)] hover:bg-teal-700 hover:-translate-y-px",
        outline: "border border-line bg-white/80 text-ink hover:border-teal-400 hover:bg-white",
        ghost: "text-ink hover:bg-ink/5",
        danger: "bg-red-600 text-white hover:bg-red-700",
        soft: "bg-teal-50 text-teal-700 hover:bg-teal-100",
      },
      size: { sm: "h-9 px-4 text-sm", md: "h-11 px-5 text-sm", lg: "h-13 px-7 text-base", icon: "size-10" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
});
Button.displayName = "Button";
