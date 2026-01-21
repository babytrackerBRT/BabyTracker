"use client";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { supabase } from "@/lib/supabase/client";
import { sr } from "@/lib/i18n/sr";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const redirectTo = `${window.location.origin}/reset-lozinke`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    setBusy(false);
    if (error) return setErr(error.message);
    setDone(true);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">{sr.auth.forgotTitle}</h1>
      <p className="text-sm text-gray-500">{sr.auth.forgotInfo}</p>

      <Card>
        {done ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">{sr.auth.checkEmail}</div>
            <Link className="text-brand-700 text-sm" href="/login">Nazad na prijavu</Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label className="text-sm font-semibold">{sr.auth.email}</label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@primer.com" type="email" />
            </div>
            {err && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</div>}
            <Button disabled={busy} className="w-full">{busy ? "Učitavanje…" : sr.auth.sendLink}</Button>
            <div className="text-sm">
              <Link className="text-brand-700" href="/login">Nazad</Link>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
