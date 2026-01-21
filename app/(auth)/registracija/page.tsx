"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { supabase } from "@/lib/supabase/client";
import { sr } from "@/lib/i18n/sr";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (p1.length < 8) return setErr("Lozinka treba da ima najmanje 8 karaktera.");
    if (p1 !== p2) return setErr("Lozinke se ne poklapaju.");
    setBusy(true);
    const { error } = await supabase.auth.signUp({ email, password: p1 });
    setBusy(false);
    if (error) return setErr(error.message);
    router.replace("/dashboard");
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">{sr.auth.signup}</h1>
      <p className="text-sm text-gray-500">Kreirajte nalog (porodica se automatski kreira).</p>

      <Card>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="text-sm font-semibold">{sr.auth.email}</label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@primer.com" type="email" />
          </div>
          <div>
            <label className="text-sm font-semibold">{sr.auth.password}</label>
            <Input value={p1} onChange={(e) => setP1(e.target.value)} placeholder="••••••••" type="password" />
          </div>
          <div>
            <label className="text-sm font-semibold">{sr.auth.password2}</label>
            <Input value={p2} onChange={(e) => setP2(e.target.value)} placeholder="••••••••" type="password" />
          </div>
          {err && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</div>}
          <Button disabled={busy} className="w-full">{busy ? "Učitavanje…" : sr.auth.signupBtn}</Button>
          <div className="text-sm">
            <Link className="text-brand-700" href="/login">{sr.auth.haveAccount}</Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
