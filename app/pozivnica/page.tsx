import { Suspense } from "react";
import PozivnicaClient from "./PozivnicaClient";

// u export modu mora biti statično
export const dynamic = "force-static";

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
