"use client";
import React from "react";
import { BottomTabs } from "./BottomTabs";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen"
      style={{
        // ✅ gore ispod status bara (notch/clock)
        paddingTop: "env(safe-area-inset-top)",
        // ✅ dole iznad sistemskih dugmića + malo lufta
        paddingBottom: "calc(env(safe-area-inset-bottom) + 96px)",
      }}
    >
      <div className="mx-auto max-w-md px-4 pt-4">{children}</div>
      <BottomTabs />
    </div>
  );
}
