import { Suspense } from "react";
import PozivnicaClient from "./PozivnicaClient";

// ✅ Kada gradimo za Android (CAP_BUILD=1) moramo biti statični (export mode).
// ✅ Kada gradimo za Vercel SSR možemo biti dynamic (nije obavezno, ali je okej).
export const dynamic =
  process.env.CAP_BUILD === "1" ? "force-static" : "force-dynamic";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-sm text-gray-500">
          Učitavanje…
        </div>
      }
    >
      <PozivnicaClient />
    </Suspense>
  );
}
