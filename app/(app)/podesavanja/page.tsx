"use client";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Chip } from "@/components/ui/Chip";
import { getMyFamilyId, listBabies, updateBabyName, addBaby, listInvites, createInvite, listFamilyMembers } from "@/lib/data/family";
import type { Baby, FamilyInvite, FamilyMember } from "@/types/db";
import { formatDate, randomToken } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";

export default function SettingsPage() {
  const [familyId, setFamilyId] = useState("");
  const [babies, setBabies] = useState<Baby[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [name, setName] = useState("");
  const [birth, setBirth] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);

  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [invites, setInvites] = useState<FamilyInvite[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");

  const selectedBaby = useMemo(() => babies.find(b => b.id === selected) ?? null, [babies, selected]);

  async function load() {
    try {
      setErr(null);
      const fid = await getMyFamilyId();
      setFamilyId(fid);
      const b = await listBabies(fid);
      setBabies(b);
      const sel = selected || b[0]?.id || "";
      setSelected(sel);
      const sb = b.find(x => x.id === sel);
      setName(sb?.name ?? "");
      setBirth(sb?.birth_date ?? "");
      const mem = await listFamilyMembers(fid);
      setMembers(mem);
      const inv = await listInvites(fid);
      setInvites(inv);
    } catch (e: any) {
      setErr(e?.message ?? "Greška");
    }
  }

  useEffect(() => { load(); }, []);

  async function saveBaby() {
    if (!selectedBaby) return;
    await updateBabyName(selectedBaby.id, name.trim() || "Beba");
    // birth_date update:
    const { error } = await supabase.from("babies").update({ birth_date: birth || null }).eq("id", selectedBaby.id);
    if (error) throw error;
    await load();
  }

  async function addSecondBaby() {
    if (!familyId) return;
    await addBaby(familyId, "Beba 2");
    await load();
  }

  async function sendInvite() {
    if (!familyId) return;
    if (!inviteEmail.includes("@")) return setErr("Unesite ispravan email.");
    const token = randomToken(48);
    await createInvite(familyId, inviteEmail, token);
    await load();
    setInviteEmail("");
    // For MVP testing, we show the invite link format:
    alert(`Pozivnica kreirana. Link (pošalji ručno): ${window.location.origin}/pozivnica?token=${token}`);
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-semibold text-gray-500">Pogo Baby Log</div>
        <h1 className="text-2xl font-extrabold">Podešavanja</h1>
      </div>

      {err && <Card className="border-red-200 bg-red-50 text-red-700">{err}</Card>}

      <Card className="space-y-3">
        <div className="text-sm font-extrabold">Porodica i bebe</div>

        <div className="flex flex-wrap gap-2">
          {babies.map(b => (
            <Chip key={b.id} active={b.id === selected} onClick={() => { setSelected(b.id); setName(b.name); setBirth(b.birth_date ?? ""); }}>
              {b.name}
            </Chip>
          ))}
          {babies.length < 2 && (
            <button
              onClick={addSecondBaby}
              className="rounded-full border border-dashed border-gray-300 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200"
              type="button"
            >
              + Dodaj bebu
            </button>
          )}
        </div>

        {selectedBaby && (
          <div className="rounded-2xl border border-gray-200 p-3 dark:border-gray-800 space-y-2">
            <div className="text-xs font-semibold text-gray-500">Podešavanja bebe</div>
            <div>
              <label className="text-sm font-semibold">Ime</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-semibold">Datum rođenja</label>
              <Input value={birth} onChange={(e) => setBirth(e.target.value)} type="date" />
            </div>
            <Button onClick={saveBaby} className="w-full">Sačuvaj</Button>
          </div>
        )}
      </Card>

      <Card className="space-y-3">
        <div className="text-sm font-extrabold">Roditelji</div>
        <div className="space-y-2">
          {members.map(m => (
            <div key={m.user_id} className="flex items-center justify-between rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-800">
              <div className="font-semibold">{m.role === "admin" ? "Roditelj 1 (Admin)" : "Roditelj"}</div>
              <div className="text-xs text-gray-500">{m.role}</div>
            </div>
          ))}
          <div className="rounded-2xl border border-gray-200 p-3 dark:border-gray-800">
            <div className="text-sm font-semibold">Dodaj roditelja</div>
            <div className="mt-2 space-y-2">
              <Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="email@primer.com" type="email" />
              <Button onClick={sendInvite} className="w-full">Pošalji pozivnicu</Button>
              <div className="text-xs text-gray-500">Za MVP, link se prikazuje kao alert (možeš da ga pošalješ ručno). Kasnije ubacujemo slanje emaila.</div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="space-y-2">
        <div className="text-sm font-extrabold">Pozivnice</div>
        {invites.length ? invites.map(i => (
          <div key={i.id} className="rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div className="font-semibold">{i.invited_email}</div>
              <div className="text-xs text-gray-500">{i.status}</div>
            </div>
            <div className="text-xs text-gray-500">Važi do: {formatDate(i.expires_at)}</div>
          </div>
        )) : <div className="text-sm text-gray-500">Nema pozivnica.</div>}
      </Card>
    </div>
  );
}
