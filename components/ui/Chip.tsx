"use client";
import React from "react";
import { cn } from "@/lib/utils";

export function Chip({ active, children, onClick }: { active?: boolean; children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-2 text-sm font-semibold border transition",
        active ? "bg-brand-600 text-white border-brand-600" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-200 dark:border-gray-800"
      )}
      type="button"
    >
      {children}
    </button>
  );
}
