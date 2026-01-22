"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
// po potrebi promeni import na tvoj AuthProvider
import { useAuth } from "@/components/auth/AuthProvider";

export default function CapEntry() {
  const router = useRouter();
  const { user, loading } = useAuth?.() ?? { user: null, loading: false };

  useEffect(() => {
    if (loading) return;
    // ako nemaš AuthProvider, koristi samo router.replace("/login")
    router.replace(user ? "/dashboard" : "/login");
  }, [loading, user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center text-sm text-gray-500">
      Učitavanje…
    </div>
  );
}
