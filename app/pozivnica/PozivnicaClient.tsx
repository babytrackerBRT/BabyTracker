"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";

export default function PozivnicaClient() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const router = useRouter();
  const { user, loading } = useAuth();
  const [msg, setMsg] = useState<string>("");

  useEffect(() => {
    if (!token) setMsg("Nedostaje token pozivnice.");
  }, [token]);

  async function accept() {
    setMsg("");
    const { error } = await supabase.rpc("accept_family_invite", {
      p_token: token,
    });
    if (error) return setMsg(error.message);
    setMsg("Pozivnica prihvaćena. Preusmeravamo…");
    router.replace("/dashboard");
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-md px-4 pt-10 pb-10 space-y-4">
        <h1 className="text-2xl font-extrabold">Pozivnica</h1>
        <Card className="space-y-3">
          {!token ? (
            <div className="text-sm text-red-600">Neispravan link.</div>
          ) : loading ? (
            <div className="text-sm text-gray-500">Učitavanje…</div>
          ) : !user ? (
            <div className="space-y-3">
              <div className="text-sm text-gray-600">
                Da biste prihvatili pozivnicu, potrebno je da se prijavite ili
                registrujete sa istim emailom na koji je pozivnica poslata.
              </div>
              <div className="flex gap-2">
                <Button onClick={() => router.push("/login")} className="flex-1">
                  Prijava
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => router.push("/registracija")}
                  className="flex-1"
                >
                  Registracija
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm text-gray-600">
                Kliknite da prihvatite pozivnicu i pridružite se porodici.
              </div>
              <Button onClick={accept} className="w-full">
                Prihvati pozivnicu
              </Button>
            </div>
          )}
          {msg && <div className="text-sm text-gray-700">{msg}</div>}
        </Card>
      </div>
    </div>
  );
}
