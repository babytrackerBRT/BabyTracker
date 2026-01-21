"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { getMyFamilyId, listBabies } from "@/lib/data/family";
import { listRecentEvents } from "@/lib/data/events";
import type { Baby, EventRow } from "@/types/db";
import { formatDate, formatTime } from "@/lib/utils";

export default function TimelinePage() {
  const [familyId, setFamilyId] = useState("");
  const [babies, setBabies] = useState<Baby[]>([]);
  const [babyId, setBabyId] = useState<string>(""); // filter
  const [events, setEvents] = useState<EventRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    try {
      setErr(null);
      const fid = await getMyFamilyId();
      setFamilyId(fid);
      const b = await listBabies(fid);
      setBabies(b);
      const ev = await listRecentEvents(fid, 100);
      setEvents(ev);
    } catch (e: any) {
      setErr(e?.message ?? "Greška");
    }
  }
  useEffect(() => { load(); }, []);

  const filtered = babyId ? events.filter(e => e.baby_id === babyId) : events;

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-semibold text-gray-500">Pogo Baby Log</div>
        <h1 className="text-2xl font-extrabold">Dnevnik</h1>
      </div>

      {err && <Card className="border-red-200 bg-red-50 text-red-700">{err}</Card>}

      <div className="flex flex-wrap gap-2">
        <Chip active={!babyId} onClick={() => setBabyId("")}>Sve</Chip>
        {babies.map(b => (
          <Chip key={b.id} active={b.id === babyId} onClick={() => setBabyId(b.id)}>{b.name}</Chip>
        ))}
      </div>

      <Card>
        <div className="text-sm font-extrabold">Poslednji unosi</div>
        <div className="mt-3 space-y-2">
          {filtered.length ? filtered.map(e => (
            <div key={e.id} className="rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-800">
              <div className="flex items-center justify-between">
                <div className="font-semibold">{e.type === "feeding" ? "Hranjenje" : e.type === "diaper" ? "Pelena" : "Zdravlje"}</div>
                <div className="text-xs text-gray-500">{formatDate(e.occurred_at)} • {formatTime(e.occurred_at)}</div>
              </div>
              <div className="mt-1 text-xs text-gray-500">
                {e.type === "feeding" && <>Mode: {e.feeding_mode} • Količina: {e.amount_ml ?? "—"} ml</>}
                {e.type === "diaper" && <>Tip: {e.diaper_kind}</>}
                {e.note && <> • {e.note}</>}
              </div>
            </div>
          )) : <div className="text-sm text-gray-500">Još nema unosa.</div>}
        </div>
      </Card>
    </div>
  );
}
