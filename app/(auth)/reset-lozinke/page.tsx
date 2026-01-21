"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { supabase } from "@/lib/supabase/client";
import { sr } from "@/lib/i18n/sr";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase will set session from URL (recovery)
    supabase.auth.getSession().then(() => setReady(true));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (p1.length < 8) return setErr("Lozinka treba da ima najmanje 8 karaktera.");
    if (p1 !== p2) return setErr("Lozinke se ne poklapaju.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: p1 });
    setBusy(false);
    if (error) return setErr(error.message);
    router.replace("/dashboard");
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">{sr.auth.resetTitle}</h1>
      <p className="text-sm text-gray-500">Unesite novu lozinku.</p>

      <Card>
        {!ready ? (
          <div className="text-sm text-gray-500">Učitavanje…</div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label className="text-sm font-semibold">Nova lozinka</label>
              <Input value={p1} onChange={(e) => setP1(e.target.value)} placeholder="••••••••" type="password" />
            </div>
            <div>
              <label className="text-sm font-semibold">Potvrdi lozinku</label>
              <Input value={p2} onChange={(e) => setP2(e.target.value)} placeholder="••••••••" type="password" />
            </div>
            {err && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</div>}
            <Button disabled={busy} className="w-full">{busy ? "Učitavanje…" : sr.auth.saveNew}</Button>
          </form>
        )}
      </Card>
    </div>
  );
}
