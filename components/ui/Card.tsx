import React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl border border-gray-200 bg-white p-4 shadow-soft dark:bg-gray-900 dark:border-gray-800", className)} {...props} />;
}
