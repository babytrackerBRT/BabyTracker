import type { Metadata } from "next";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppShell } from "@/components/layout/AppShell";
import { NotificationsBootstrap } from "@/components/native/NotificationsBootstrap";

export const metadata: Metadata = {
  title: "Baby Tracker",
  description: "Quick baby logs: feeding, diapers, sleep, meds.",
  manifest: "/manifest.json",
  themeColor: "#FFB37A",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Baby Tracker"
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }
    ]
  }
};

export default function AppLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      <NotificationsBootstrap />
      <AppShell>{children}</AppShell>
    </RequireAuth>
  );
}
