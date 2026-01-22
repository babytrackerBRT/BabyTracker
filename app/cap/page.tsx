import dynamicImport from "next/dynamic";

export const dynamic = "force-dynamic";

// ✅ SSR-free: server vrati samo fallback, client renderuje sve
const CapEntryClient = dynamicImport(() => import("./CapEntryClient"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center text-sm text-gray-500">
      Učitavanje…
    </div>
  ),
});

export default function CapPage() {
  return <CapEntryClient />;
}
