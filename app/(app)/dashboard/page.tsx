"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { DiaperModal } from "@/components/modals/DiaperModal";
import { FeedingModal } from "@/components/modals/FeedingModal";
import { SleepModal } from "@/components/modals/SleepModal";

import { getMyFamilyId, listBabies } from "@/lib/data/family";
import { listUpcomingOccurrences } from "@/lib/data/reminders";
import { listRecentEvents, createFeeding, createDiaper } from "@/lib/data/events";
import { getActiveSleepSession, startSleepSession, stopSleepSession } from "@/lib/data/sleep";

import type { Baby, EventRow, ReminderOccurrence } from "@/types/db";
import { formatTime } from "@/lib/utils";

export default function DashboardPage() {
  const [familyId, setFamilyId] = useState<string>("");
  const [babies, setBabies] = useState<Baby[]>([]);
  const [babyId, setBabyId] = useState<string>("");

  const [events, setEvents] = useState<EventRow[]>([]);
  const [reminders, setReminders] = useState<ReminderOccurrence[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const [openDiaper, setOpenDiaper] = useState(false);
  const [openFeeding, setOpenFeeding] = useState(false);
  const [openSleep, setOpenSleep] = useState(false);

  async function load() {
    try {
      setErr(null);

      const fid = await getMyFamilyId();
      setFamilyId(fid);

      const b = await listBabies(fid);
      setBabies(b);
      setBabyId((prev) => prev || b[0]?.id || "");

      const ev = await listRecentEvents(fid, 30);
      setEvents(ev);

      const ro = await listUpcomingOccurrences(fid);
      setReminders(ro.slice(0, 6));
    } catch (e: any) {
      setErr(e?.message ?? "Greška");
    }
  }

  useEffect(() => {
    load();
  }, []);

  const lastFeeding = events.find(
    (e) => e.type === "feeding" && (!babyId || e.baby_id === babyId)
  );

  const lastDiaper = events.find(
    (e) => e.type === "diaper" && (!babyId || e.baby_id === babyId)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-gray-500">Pogo Baby Log</div>
          <h1 className="text-2xl font-extrabold">Početna</h1>
        </div>

        {/* ✅ Odjava je prebačena u Podešavanja */}
      </div>

      {err && <Card className="border-red-200 bg-red-50 text-red-700">{err}</Card>}

      <div className="flex flex-wrap gap-2">
        {babies.map((b) => (
          <Chip key={b.id} active={b.id === babyId} onClick={() => setBabyId(b.id)}>
            {b.name}
          </Chip>
        ))}
        {!babies.length && (
          <div className="text-sm text-gray-500">
            Nema beba (trebalo bi automatski da postoji „Beba 1“).
          </div>
        )}
      </div>

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

        <div className="mt-2 text-xs text-gray-500">
          Sledeći korak: Dnevnik (timeline) + edit/delete.
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div className="text-sm font-extrabold">Današnji podsetnici (preview)</div>
          <button
            className="text-sm font-semibold text-brand-700"
            onClick={() => window.location.assign("/podsetnici")}
          >
            Otvori
          </button>
        </div>

        <div className="mt-3 space-y-2">
          {reminders.length ? (
            reminders.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-800"
              >
                <div className="min-w-0">
                  <div className="truncate font-semibold">{r.title}</div>
                  <div className="text-xs text-gray-500">
                    {formatTime(r.scheduled_for)} • {r.category}
                  </div>
                </div>
                <div className="text-xs font-semibold text-gray-500">{r.status}</div>
              </div>
            ))
          ) : (
            <div className="text-sm text-gray-500">Nema podsetnika unapred.</div>
          )}
        </div>
      </Card>

      <DiaperModal
        open={openDiaper}
        onClose={() => setOpenDiaper(false)}
        babies={babies}
        initialBabyId={babyId}
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
        initialBabyId={babyId}
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
        initialBabyId={babyId}
        getActiveSession={async (bId) => getActiveSleepSession(bId)}
        startSleep={async (bId) => {
          if (!familyId) return;
          await startSleepSession(familyId, bId);
        }}
        stopSleep={async (sessionId, payload) => {
          await stopSleepSession(sessionId, payload);
          await load();
        }}
      />
    </div>
  );
}
