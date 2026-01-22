import "./globals.css";
import type { Metadata } from "next";
import { AuthProvider } from "@/components/auth/AuthProvider";

export const metadata: Metadata = {
  title: "Pogo Baby Log",
  description: "Praćenje bebe (hranjenje, pelene, spavanje, podsetnici).",
};

const THEME_SCRIPT = `
(function () {
  try {
    var key = "pogo_theme";
    var saved = localStorage.getItem(key);

    // default: LIGHT dok ne sredimo dark kako treba
    var theme = saved || "light";

    var root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");

    // safe-area padding (top + bottom)
    var body = document.body;
    if (body) {
      body.style.paddingTop = "env(safe-area-inset-top)";
      body.style.paddingBottom = "env(safe-area-inset-bottom)";
    }
  } catch (e) {}
})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sr" suppressHydrationWarning>
      <head>
        {/* ✅ Material Symbols (Rounded) */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,600,0,0"
        />
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
