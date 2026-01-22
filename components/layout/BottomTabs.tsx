"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { sr } from "@/lib/i18n/sr";

const tabs = [
  { href: "/dashboard", label: sr.tabs.dashboard, icon: "home" },
  { href: "/dnevnik", label: sr.tabs.timeline, icon: "history" },
  { href: "/podsetnici", label: sr.tabs.reminders, icon: "calendar_month" },
  { href: "/podesavanja", label: sr.tabs.settings, icon: "settings" },
];

export function BottomTabs() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur dark:bg-gray-900/95 dark:border-gray-800"
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="mx-auto flex max-w-md items-center justify-around px-2 py-2">
        {tabs.map((t) => {
          const active = pathname.startsWith(t.href);

          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold",
                "active:scale-[0.98] transition-transform",
                active ? "text-brand-700" : "text-gray-500 dark:text-gray-300"
              )}
            >
              <span
                className={cn(
                  "material-symbols-rounded text-[22px] leading-none",
                  active ? "" : "opacity-80"
                )}
                aria-hidden="true"
              >
                {t.icon}
              </span>
              <span>{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
