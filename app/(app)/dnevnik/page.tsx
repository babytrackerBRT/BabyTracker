//app/(app)/dnevnik/page.tsx
"use client";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Chip } from "@/components/ui/Chip";
import { getMyFamilyId, listBabies } from "@/lib/data/family";
import { listRecentEvents } from "@/lib/data/events";
import type { Baby, EventRow } from "@/types/db";
import { formatDate, formatTime } from "@/lib/utils";

export default function DnevnikPage() {
  const [familyId, setFamilyId] = useState("");
  const [babies, setBabies] = useState<Baby[]>([]);
  const [babyId, setBabyId] = useState<string>(""); // "" = all
  const [events, setEvents] = useState<EventRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  async function load() {
    try {
      setErr(null);
      const fid = await getMyFamilyId();
      setFamilyId(fid);

      const b = await listBabies(fid);
      setBabies(b);

      const ev = await listRecentEvents(fid, 200);
      setEvents(ev);
    } catch (e: any) {
      setErr(e?.message ?? "Greška");
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const fromTs = from ? new Date(from).getTime() : null;
    const toTs = to ? new Date(to).getTime() : null;

    return events.filter((e) => {
      if (babyId && e.baby_id !== babyId) return false;

      const ts = new Date(e.occurred_at).getTime();
      if (fromTs && ts < fromTs) return false;
      if (toTs && ts > toTs) return false;

      if (!q) return true;

      const blob = [
        e.type,
        e.feeding_mode,
        e.diaper_kind,
        e.note,
        e.amount_ml?.toString(),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return blob.includes(q);
    });
  }, [events, babyId, query, from, to]);

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-semibold text-gray-500">Pogo Baby Log</div>
        <h1 className="text-2xl font-extrabold">Dnevnik</h1>
      </div>

      {err && <Card className="border-red-200 bg-red-50 text-red-700">{err}</Card>}

      <Card className="space-y-3">
        <div className="text-sm font-extrabold">Filter</div>

        <div className="flex flex-wrap gap-2">
          <Chip active={!babyId} onClick={() => setBabyId("")}>
            Sve
          </Chip>
          {babies.map((b) => (
            <Chip key={b.id} active={b.id === babyId} onClick={() => setBabyId(b.id)}>
              {b.name}
            </Chip>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-2">
          <div>
            <div className="text-xs font-semibold text-gray-500">Pretraga</div>
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="npr. formula, mokra..." />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-xs font-semibold text-gray-500">Od</div>
              <Input value={from} onChange={(e) => setFrom(e.target.value)} type="date" />
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-500">Do</div>
              <Input value={to} onChange={(e) => setTo(e.target.value)} type="date" />
            </div>
          </div>

          <Button variant="secondary" onClick={load} className="w-full">
            Osveži
          </Button>
        </div>
      </Card>

      <Card>
        <div className="text-sm font-extrabold">Unosi</div>

        <div className="mt-3 space-y-2">
          {filtered.length ? (
            filtered.map((e) => (
              <div key={e.id} className="rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">
                    {e.type === "feeding"
                      ? "Hranjenje"
                      : e.type === "diaper"
                      ? "Pelena"
                      : e.type}
                  </div>
                  <div className="text-xs text-gray-500">{formatTime(e.occurred_at)}</div>
                </div>

                <div className="mt-1 text-xs text-gray-500">
                  {formatDate(e.occurred_at)}
                  {e.feeding_mode ? ` • ${e.feeding_mode}` : ""}
                  {typeof e.amount_ml === "number" ? ` • ${e.amount_ml} ml` : ""}
                  {e.diaper_kind ? ` • ${e.diaper_kind}` : ""}
                </div>

                {e.note && <div className="mt-2 text-sm">{e.note}</div>}
              </div>
            ))
          ) : (
            <div className="text-sm text-gray-500">Nema unosa.</div>
          )}
        </div>
      </Card>
    </div>
  );
}
