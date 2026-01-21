import "./globals.css";
import type { Metadata } from "next";
import { AuthProvider } from "@/components/auth/AuthProvider";

export const metadata: Metadata = {
  title: "Pogo Baby Log",
  description: "Praćenje brige o bebi (MVP)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sr">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
