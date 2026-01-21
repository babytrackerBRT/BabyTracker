"use client";
import React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
export function Button({
  children, className, variant = "primary", ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const base = "inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed";
  const styles: Record<Variant, string> = {
    primary: "bg-brand-600 text-white hover:bg-brand-700 shadow-soft",
    secondary: "bg-white/90 text-gray-900 border border-gray-200 hover:bg-white dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700",
    ghost: "bg-transparent text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800",
    danger: "bg-red-600 text-white hover:bg-red-700 shadow-soft",
  };
  return <button className={cn(base, styles[variant], className)} {...props}>{children}</button>;
}
