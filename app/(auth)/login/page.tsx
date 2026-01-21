"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { supabase } from "@/lib/supabase/client";
import { sr } from "@/lib/i18n/sr";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    setBusy(false);
    if (error) return setErr(error.message);
    router.replace("/dashboard");
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">{sr.auth.login}</h1>
      <p className="text-sm text-gray-500">Prijavite se da biste nastavili.</p>

      <Card>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="text-sm font-semibold">{sr.auth.email}</label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@primer.com" type="email" />
          </div>
          <div>
            <label className="text-sm font-semibold">{sr.auth.password}</label>
            <Input value={pass} onChange={(e) => setPass(e.target.value)} placeholder="••••••••" type="password" />
          </div>
          {err && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</div>}
          <Button disabled={busy} className="w-full">{busy ? "Učitavanje…" : sr.auth.loginBtn}</Button>
          <div className="flex items-center justify-between text-sm">
            <Link className="text-brand-700" href="/zaboravljena-lozinka">{sr.auth.forgot}</Link>
            <Link className="text-brand-700" href="/registracija">{sr.auth.signup}</Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
