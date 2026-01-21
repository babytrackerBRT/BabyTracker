"use client";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabase/client";
import { getMyFamilyId, listBabies } from "@/lib/data/family";
import { listUpcomingOccurrences } from "@/lib/data/reminders";
import { listRecentEvents, createFeeding, createDiaper } from "@/lib/data/events";
import type { Baby, EventRow, ReminderOccurrence } from "@/types/db";
import { formatTime } from "@/lib/utils";

export default function DashboardPage() {
  const [familyId, setFamilyId] = useState<string>("");
  const [babies, setBabies] = useState<Baby[]>([]);
  const [babyId, setBabyId] = useState<string>("");
  const [events, setEvents] = useState<EventRow[]>([]);
  const [reminders, setReminders] = useState<ReminderOccurrence[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const selectedBaby = useMemo(() => babies.find(b => b.id === babyId) ?? null, [babies, babyId]);

  async function load() {
    try {
      setErr(null);
      const fid = await getMyFamilyId();
      setFamilyId(fid);
      const b = await listBabies(fid);
      setBabies(b);
      setBabyId(prev => prev || b[0]?.id || "");
      const ev = await listRecentEvents(fid, 20);
      setEvents(ev);
      const ro = await listUpcomingOccurrences(fid);
      setReminders(ro.slice(0, 6));
    } catch (e: any) {
      setErr(e?.message ?? "Greška");
    }
  }

  useEffect(() => { load(); }, []);

  const lastFeeding = events.find(e => e.type === "feeding" && (!babyId || e.baby_id === babyId));
  const lastDiaper = events.find(e => e.type === "diaper" && (!babyId || e.baby_id === babyId));

  async function quickFeeding() {
    if (!familyId || !babyId) return;
    await createFeeding(familyId, babyId, "formula", 90);
    await load();
  }

  async function quickDiaper() {
    if (!familyId || !babyId) return;
    await createDiaper(familyId, babyId, "wet");
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-gray-500">Pogo Baby Log</div>
          <h1 className="text-2xl font-extrabold">Početna</h1>
        </div>
        <button
          className="rounded-full border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 dark:border-gray-800 dark:text-gray-200"
          onClick={async () => { await supabase.auth.signOut(); }}
        >
          Odjava
        </button>
      </div>

      {err && <Card className="border-red-200 bg-red-50 text-red-700">{err}</Card>}

      <div className="flex flex-wrap gap-2">
        {babies.map(b => (
          <Chip key={b.id} active={b.id === babyId} onClick={() => setBabyId(b.id)}>{b.name}</Chip>
        ))}
        {!babies.length && <div className="text-sm text-gray-500">Nema beba (trebalo bi automatski da postoji „Beba 1“).</div>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <div className="text-xs font-semibold text-gray-500">Poslednje hranjenje</div>
          <div className="mt-2 text-lg font-extrabold">{lastFeeding ? `${formatTime(lastFeeding.occurred_at)} • ${lastFeeding.amount_ml ?? ""} ml` : "—"}</div>
          <div className="mt-1 text-xs text-gray-500">{lastFeeding ? (lastFeeding.feeding_mode ?? "—") : "Nema unosa još."}</div>
        </Card>
        <Card>
          <div className="text-xs font-semibold text-gray-500">Poslednja pelena</div>
          <div className="mt-2 text-lg font-extrabold">{lastDiaper ? `${formatTime(lastDiaper.occurred_at)} • ${lastDiaper.diaper_kind ?? ""}` : "—"}</div>
          <div className="mt-1 text-xs text-gray-500">{lastDiaper ? "Zabeleženo" : "Nema unosa još."}</div>
        </Card>
      </div>

      <Card>
        <div className="text-sm font-extrabold">Brze radnje</div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button onClick={quickFeeding}>+ Hranjenje (90ml)</Button>
          <Button variant="secondary" onClick={quickDiaper}>+ Pelena (mokra)</Button>
          <Button variant="secondary" onClick={() => window.location.assign("/podsetnici")}>Podsetnici</Button>
          <Button variant="ghost" onClick={() => window.location.assign("/podesavanja")}>Podešavanja</Button>
        </div>
        <div className="mt-2 text-xs text-gray-500">Ovo su “quick log” prečice za testiranje baze. Sledeća iteracija ubacuje full modale.</div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div className="text-sm font-extrabold">Današnji podsetnici (preview)</div>
          <button className="text-sm font-semibold text-brand-700" onClick={() => window.location.assign("/podsetnici")}>Otvori</button>
        </div>
        <div className="mt-3 space-y-2">
          {reminders.length ? reminders.map(r => (
            <div key={r.id} className="flex items-center justify-between rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-800">
              <div className="min-w-0">
                <div className="truncate font-semibold">{r.title}</div>
                <div className="text-xs text-gray-500">{formatTime(r.scheduled_for)} • {r.category}</div>
              </div>
              <div className="text-xs font-semibold text-gray-500">{r.status}</div>
            </div>
          )) : <div className="text-sm text-gray-500">Nema podsetnika unapred.</div>}
        </div>
      </Card>
    </div>
  );
}
