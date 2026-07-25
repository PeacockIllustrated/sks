import * as React from "react";
import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Square corners, no shadows. House rules.
 * Gold on navy and navy on gold both clear AA at these weights.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-none border text-sm font-semibold tracking-wide transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "border-gold-400 bg-gold-400 text-navy-900 hover:border-gold-300 hover:bg-gold-300",
        secondary:
          "border-navy-800 bg-navy-800 text-white hover:border-navy-700 hover:bg-navy-700",
        outline:
          "border-navy-300 bg-transparent text-navy-800 hover:border-navy-800 hover:bg-navy-50",
        ghost:
          "border-transparent bg-transparent text-navy-800 hover:bg-navy-50",
        onDark:
          "border-white/30 bg-transparent text-white hover:border-white hover:bg-white/10",
      },
      size: {
        sm: "h-9 px-4",
        md: "h-11 px-6",
        lg: "h-13 px-8 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonBaseProps = VariantProps<typeof buttonVariants>;

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  ButtonBaseProps;

export function Button({
  className,
  variant,
  size,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export type ButtonLinkProps = React.ComponentProps<typeof Link> &
  ButtonBaseProps;

export function ButtonLink({
  className,
  variant,
  size,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { buttonVariants };
