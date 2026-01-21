"use client";
import React from "react";
import { BottomTabs } from "./BottomTabs";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen pb-20">
      <div className="mx-auto max-w-md px-4 pt-4">{children}</div>
      <BottomTabs />
    </div>
  );
}
