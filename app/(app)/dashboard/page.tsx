"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { DiaperModal } from "@/components/modals/DiaperModal";
import { FeedingModal } from "@/components/modals/FeedingModal";
import { SleepModal } from "@/components/modals/SleepModal";

import { getMyFamilyId, listBabies } from "@/lib/data/family";
import { listUpcomingOccurrences } from "@/lib/data/reminders";
import { listRecentEvents, createFeeding, createDiaper } from "@/lib/data/events";
import {
  getActiveSleepSession,
  startSleepSession,
  stopSleepSession,
  listRecentSleepSessions,
  type SleepSessionRow,
} from "@/lib/data/sleep";

import type { Baby, EventRow, ReminderOccurrence } from "@/types/db";
import { formatTime } from "@/lib/utils";

function daysBetween(aIso?: string | null, b = new Date()) {
  if (!aIso) return null;
  const a = new Date(aIso);
  if (Number.isNaN(a.getTime())) return null;
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function recommendedIntervalMinutes(birthDateIso?: string | null): number {
  const days = daysBetween(birthDateIso);
  if (days == null) return 165;
  if (days <= 30) return 150;
  if (days <= 90) return 180;
  if (days <= 180) return 210;
  return 240;
}

function minutesUntil(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.round(ms / 60000));
}

function msToHhMm(ms: number) {
  const totalMin = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `${m} min`;
  return `${h}h ${m}m`;
}

const AAP_LINK =
  "https://www.healthychildren.org/English/ages-stages/baby/feeding-nutrition/Pages/how-often-and-how-much-should-your-baby-eat.aspx";

export default function DashboardPage() {
  const [familyId, setFamilyId] = useState<string>("");
  const [babies, setBabies] = useState<Baby[]>([]);
  const [babyId, setBabyId] = useState<string>(""); // "" = Sve bebe

  const [events, setEvents] = useState<EventRow[]>([]);
  const [sleepSessions, setSleepSessions] = useState<SleepSessionRow[]>([]);
  const [reminders, setReminders] = useState<ReminderOccurrence[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const [openDiaper, setOpenDiaper] = useState(false);
  const [openFeeding, setOpenFeeding] = useState(false);
  const [openSleep, setOpenSleep] = useState(false);

  // sleep heads-up
  const [activeSleep, setActiveSleep] = useState<{ id: string; started_at: string } | null>(null);
  const [busySleep, setBusySleep] = useState(false);

  async function load() {
    try {
      setErr(null);

      const fid = await getMyFamilyId();
      setFamilyId(fid);

      const b = await listBabies(fid);
      setBabies(b);

      // default: prva beba (ali dozvoljavamo "" = sve)
      if (!babyId && b[0]?.id) setBabyId(b[0].id);

      const ev = await listRecentEvents(fid, 300);
      setEvents(ev);

      const ss = await listRecentSleepSessions(fid, 200);
      setSleepSessions(ss);

      const ro = await listUpcomingOccurrences(fid);
      setReminders(ro.slice(0, 20));
    } catch (e: any) {
      setErr(e?.message ?? "Greška");
    }
  }

  async function refreshSleep(bId: string) {
    try {
      const s = await getActiveSleepSession(bId);
      setActiveSleep(s);
    } catch {
      setActiveSleep(null);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!babyId) return;
    refreshSleep(babyId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [babyId]);

  const activeBaby = useMemo(
    () => babies.find((b) => b.id === babyId) ?? null,
    [babies, babyId]
  );

  // --- HEADS-UP interval
  const intervalMin = useMemo(() => {
    if (!activeBaby) return 165;
    const useRec = (activeBaby as any)?.use_recommended_interval !== false;
    const custom = (activeBaby as any)?.feeding_interval_minutes;
    if (!useRec && typeof custom === "number" && Number.isFinite(custom)) return custom;
    return recommendedIntervalMinutes(activeBaby.birth_date ?? null);
  }, [activeBaby]);

  const prepMin = Math.max(0, intervalMin - 15);

  // --- FEEDING head-up reminders
  const nextPrep = useMemo(() => {
    return reminders.find((r) => {
      const cat = String((r as any).category);
      return r.status === "scheduled" && cat === "feeding_prep" && (!babyId || r.baby_id === babyId);
    });
  }, [reminders, babyId]);

  const nextDue = useMemo(() => {
    return reminders.find((r) => {
      const cat = String((r as any).category);
      return r.status === "scheduled" && cat === "feeding_due" && (!babyId || r.baby_id === babyId);
    });
  }, [reminders, babyId]);

  const lastFeeding = useMemo(() => {
    return events.find(
      (e) => e.type === "feeding" && (!babyId || e.baby_id === babyId)
    );
  }, [events, babyId]);

  const lastDiaper = useMemo(() => {
    return events.find(
      (e) => e.type === "diaper" && (!babyId || e.baby_id === babyId)
    );
  }, [events, babyId]);

  const derivedPrepText = useMemo(() => {
    if (nextPrep?.scheduled_for) return `${minutesUntil(nextPrep.scheduled_for)} min`;
    if (lastFeeding?.occurred_at) {
      const at = new Date(lastFeeding.occurred_at).getTime() + prepMin * 60_000;
      return `${Math.max(0, Math.round((at - Date.now()) / 60000))} min`;
    }
    return "—";
  }, [nextPrep, lastFeeding, prepMin]);

  const derivedDueText = useMemo(() => {
    if (nextDue?.scheduled_for) return `${minutesUntil(nextDue.scheduled_for)} min`;
    if (lastFeeding?.occurred_at) {
      const at = new Date(lastFeeding.occurred_at).getTime() + intervalMin * 60_000;
      return `${Math.max(0, Math.round((at - Date.now()) / 60000))} min`;
    }
    return "—";
  }, [nextDue, lastFeeding, intervalMin]);

  // --- SLEEP heads-up
  const sleepDuration = useMemo(() => {
    if (!activeSleep?.started_at) return null;
    return msToHhMm(Date.now() - new Date(activeSleep.started_at).getTime());
  }, [activeSleep]);

  async function quickStopSleep() {
    if (!activeSleep?.id) return;
    const ok = confirm("Završi spavanje?");
    if (!ok) return;

    try {
      setBusySleep(true);
      await stopSleepSession(activeSleep.id, { quality: "normal" });
      if (babyId) await refreshSleep(babyId);
      await load();
    } finally {
      setBusySleep(false);
    }
  }

  // =========================
  // 🔥 STATISTIKA 24H
  // =========================
  const stats24h = useMemo(() => {
    const since = Date.now() - 24 * 60 * 60 * 1000;

    const ev = events.filter((e) => {
      const ts = new Date(e.occurred_at).getTime();
      if (ts < since) return false;
      if (babyId && e.baby_id !== babyId) return false;
      return true;
    });

    const ss = sleepSessions.filter((s) => {
      const ts = new Date(s.started_at).getTime();
      if (ts < since) return false;
      if (babyId && s.baby_id !== babyId) return false;
      return true;
    });

    const feedings = ev.filter((e) => e.type === "feeding");
    const diapers = ev.filter((e) => e.type === "diaper");

    const formulaMl = feedings
      .filter((f) => (f.feeding_mode as any) === "formula" && typeof f.amount_ml === "number")
      .reduce((sum, f) => sum + (f.amount_ml ?? 0), 0);

    const diapersWet = diapers.filter((d) => (d.diaper_kind as any) === "wet").length;
    const diapersPoop = diapers.filter((d) => (d.diaper_kind as any) === "poop").length;
    const diapersMixed = diapers.filter((d) => (d.diaper_kind as any) === "mixed").length;

    const totalSleepMs = ss.reduce((sum, s) => {
      const start = new Date(s.started_at).getTime();
      const end = s.ended_at ? new Date(s.ended_at).getTime() : Date.now();
      return sum + Math.max(0, end - start);
    }, 0);

    return {
      feedingsCount: feedings.length,
      formulaMl,
      diapersCount: diapers.length,
      diapersWet,
      diapersPoop,
      diapersMixed,
      sleepSessions: ss.length,
      totalSleepMs,
    };
  }, [events, sleepSessions, babyId]);

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-semibold text-gray-500">Pogo Baby Log</div>
        <h1 className="text-2xl font-extrabold">Početna</h1>
      </div>

      {err && <Card className="border-red-200 bg-red-50 text-red-700">{err}</Card>}

      {/* baby filter */}
      <div className="flex flex-wrap gap-2">
        <Chip active={!babyId} onClick={() => setBabyId("")}>Sve</Chip>
        {babies.map((b) => (
          <Chip key={b.id} active={b.id === babyId} onClick={() => setBabyId(b.id)}>
            {b.name}
          </Chip>
        ))}
      </div>

      {/* STATISTIKA 24H */}
      <Card className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-sm font-extrabold">Statistika (24h)</div>
          <Button variant="secondary" onClick={load}>Osveži</Button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-800">
            <div className="text-xs font-semibold text-gray-500">Hranjenja</div>
            <div className="mt-1 text-lg font-extrabold">{stats24h.feedingsCount}</div>
            <div className="text-xs text-gray-500">
              Formula ukupno: <span className="font-semibold">{stats24h.formulaMl} ml</span>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-800">
            <div className="text-xs font-semibold text-gray-500">Pelene</div>
            <div className="mt-1 text-lg font-extrabold">{stats24h.diapersCount}</div>
            <div className="text-xs text-gray-500">
              mokra {stats24h.diapersWet} • velika {stats24h.diapersPoop} • obe {stats24h.diapersMixed}
            </div>
          </div>

          <div className="col-span-2 rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-800">
            <div className="text-xs font-semibold text-gray-500">Spavanje</div>
            <div className="mt-1 flex items-baseline justify-between">
              <div className="text-lg font-extrabold">{msToHhMm(stats24h.totalSleepMs)}</div>
              <div className="text-xs text-gray-500">{stats24h.sleepSessions} sesija</div>
            </div>
          </div>
        </div>

        <div className="text-[11px] text-gray-500">
          * Ako je sesija spavanja u toku, računa se do sada.
        </div>
      </Card>

      {/* FEEDING HEADS-UP */}
      <Card className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-sm font-extrabold">Heads-up (hranjenje)</div>
          <a className="text-sm font-semibold text-brand-700" href={AAP_LINK} target="_blank" rel="noreferrer">
            Prikaži više
          </a>
        </div>

        <div className="text-sm text-gray-600">
          Interval: <span className="font-semibold">{intervalMin} min</span>{" "}
          {activeBaby && (activeBaby as any)?.use_recommended_interval !== false ? (
            <span className="text-xs text-gray-500">(preporučeno)</span>
          ) : (
            <span className="text-xs text-gray-500">(custom)</span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-800">
            <div className="text-xs font-semibold text-gray-500">Pripremi obrok</div>
            <div className="mt-1 text-base font-extrabold">{derivedPrepText}</div>
            {nextPrep?.scheduled_for && (
              <div className="text-xs text-gray-500">{formatTime(nextPrep.scheduled_for)}</div>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-800">
            <div className="text-xs font-semibold text-gray-500">Sledeće hranjenje</div>
            <div className="mt-1 text-base font-extrabold">{derivedDueText}</div>
            {nextDue?.scheduled_for && (
              <div className="text-xs text-gray-500">{formatTime(nextDue.scheduled_for)}</div>
            )}
          </div>
        </div>
      </Card>

      {/* SLEEP HEADS-UP */}
      <Card className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-sm font-extrabold">Heads-up (spavanje)</div>
          <button
            className="text-sm font-semibold text-brand-700"
            onClick={() => setOpenSleep(true)}
            type="button"
          >
            Otvori
          </button>
        </div>

        {activeSleep ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-800">
            <div className="min-w-0">
              <div className="font-semibold">Spava</div>
              <div className="text-xs text-gray-500">
                Počelo: {formatTime(activeSleep.started_at)} • Traje: {sleepDuration}
              </div>
            </div>

            <Button onClick={quickStopSleep} disabled={busySleep}>
              {busySleep ? "…" : "Završi"}
            </Button>
          </div>
        ) : (
          <div className="text-sm text-gray-600">Trenutno ne spava.</div>
        )}
      </Card>

      {/* last cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <div className="text-xs font-semibold text-gray-500">Poslednje hranjenje</div>
          <div className="mt-2 text-lg font-extrabold">
            {lastFeeding
              ? `${formatTime(lastFeeding.occurred_at)} • ${lastFeeding.amount_ml ?? ""} ml`
              : "—"}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {lastFeeding ? lastFeeding.feeding_mode ?? "—" : "Nema unosa još."}
          </div>
        </Card>

        <Card>
          <div className="text-xs font-semibold text-gray-500">Poslednja pelena</div>
          <div className="mt-2 text-lg font-extrabold">
            {lastDiaper
              ? `${formatTime(lastDiaper.occurred_at)} • ${lastDiaper.diaper_kind ?? ""}`
              : "—"}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {lastDiaper ? "Zabeleženo" : "Nema unosa još."}
          </div>
        </Card>
      </div>

      {/* quick actions */}
      <Card>
        <div className="text-sm font-extrabold">Brze radnje</div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button onClick={() => setOpenFeeding(true)}>+ Hranjenje</Button>
          <Button variant="secondary" onClick={() => setOpenDiaper(true)}>
            + Pelena
          </Button>
          <Button variant="secondary" onClick={() => setOpenSleep(true)}>
            Spavanje
          </Button>
          <Button variant="secondary" onClick={() => window.location.assign("/podsetnici")}>
            Podsetnici
          </Button>
        </div>
      </Card>

      <DiaperModal
        open={openDiaper}
        onClose={() => setOpenDiaper(false)}
        babies={babies}
        initialBabyId={babyId || babies[0]?.id}
        onSave={async ({ babyId: bId, kind, rash, cream, note }) => {
          if (!familyId || !bId) return;
          await createDiaper(familyId, bId, kind, { rash, cream, note });
          await load();
        }}
      />

      <FeedingModal
        open={openFeeding}
        onClose={() => setOpenFeeding(false)}
        babies={babies}
        initialBabyId={babyId || babies[0]?.id}
        onSave={async ({ babyId: bId, mode, occurredAt, amountMl, note, data }) => {
          if (!familyId || !bId) return;
          await createFeeding(familyId, bId, mode, amountMl, { occurredAt, note, data });
          await load();
        }}
      />

      <SleepModal
        open={openSleep}
        onClose={() => setOpenSleep(false)}
        babies={babies}
        initialBabyId={babyId || babies[0]?.id}
        getActiveSession={async (bId) => getActiveSleepSession(bId)}
        startSleep={async (bId) => {
          if (!familyId) return;
          await startSleepSession(familyId, bId);
          await refreshSleep(bId);
          await load();
        }}
        stopSleep={async (sessionId, payload) => {
          await stopSleepSession(sessionId, payload);
          if (babyId) await refreshSleep(babyId);
          await load();
        }}
      />
    </div>
  );
}
