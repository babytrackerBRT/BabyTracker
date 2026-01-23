"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Chip } from "@/components/ui/Chip";

import { getMyFamilyId, listBabies } from "@/lib/data/family";
import {
  createDailyVitaminDefinitionAndOccurrences,
  createOneOffReminder,
  listUpcomingOccurrences,
  markOccurrenceDone,
  syncNativeNotificationsForFamily,
  snoozeOccurrence,
  rescheduleOccurrence,
  cancelOccurrence,
} from "@/lib/data/reminders";

import type { Baby, ReminderOccurrence } from "@/types/db";
import { formatDate, formatTime } from "@/lib/utils";

type Cat =
  | "doctor"
  | "meds"
  | "vitamins"
  | "care"
  | "custom"
  | "feeding_due"
  | "feeding_prep"
  | string;

function minutesUntil(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.round(ms / 60000);
}

function relTime(iso: string) {
  const m = minutesUntil(iso);
  if (m <= 0) return "sad";
  if (m < 60) return `za ${m} min`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (mm === 0) return `za ${h}h`;
  return `za ${h}h ${mm}m`;
}

function catLabel(cat: Cat) {
  switch (cat) {
    case "feeding_prep":
      return "Priprema obroka";
    case "feeding_due":
      return "Hranjenje";
    case "doctor":
      return "Doktor";
    case "meds":
      return "Lekovi";
    case "vitamins":
      return "Vitamini";
    case "care":
      return "Nega";
    case "custom":
      return "Ostalo";
    default:
      return String(cat);
  }
}

function catBadgeClass(cat: Cat) {
  switch (cat) {
    case "feeding_prep":
      return "border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-900/40 dark:bg-orange-950/30 dark:text-orange-200";
    case "feeding_due":
      return "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200";
    case "doctor":
      return "border-red-200 bg-red-50 text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200";
    case "meds":
      return "border-purple-200 bg-purple-50 text-purple-800 dark:border-purple-900/40 dark:bg-purple-950/30 dark:text-purple-200";
    case "vitamins":
      return "border-green-200 bg-green-50 text-green-800 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-200";
    case "care":
      return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200";
    case "custom":
    default:
      return "border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-200";
  }
}

function dayBuckets(items: ReminderOccurrence[]) {
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startOfTomorrow = startOfToday + 24 * 60 * 60 * 1000;
  const startOfDayAfter = startOfTomorrow + 24 * 60 * 60 * 1000;

  const todayList = items.filter((i) => {
    const t = new Date(i.scheduled_for).getTime();
    return t >= startOfToday && t < startOfTomorrow;
  });

  const tomorrowList = items.filter((i) => {
    const t = new Date(i.scheduled_for).getTime();
    return t >= startOfTomorrow && t < startOfDayAfter;
  });

  const upcomingList = items
    .filter((i) => new Date(i.scheduled_for).getTime() >= startOfDayAfter)
    .slice(0, 40);

  return { todayList, tomorrowList, upcomingList };
}

function toLocalDateTimeInputValue(d: Date) {
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

export default function RemindersPage() {
  const [familyId, setFamilyId] = useState("");
  const [babies, setBabies] = useState<Baby[]>([]);
  const [babyId, setBabyId] = useState<string>(""); // filter, ""=all
  const [items, setItems] = useState<ReminderOccurrence[]>([]);
  const [err, setErr] = useState<string | null>(null);

  // quick add
  const [vitTitle, setVitTitle] = useState("Vitamin D");
  const [vitTime, setVitTime] = useState("18:00");

  const [oneOffTitle, setOneOffTitle] = useState("Pedijatar");
  const [oneOffWhen, setOneOffWhen] = useState(() => new Date().toISOString().slice(0, 16));
  const [oneOffCategory, setOneOffCategory] = useState<Cat>("doctor");

  // busy
  const [busyId, setBusyId] = useState<string | null>(null);

  // action sheet
  const [actionFor, setActionFor] = useState<ReminderOccurrence | null>(null);
  const [editWhen, setEditWhen] = useState<Date>(new Date());

  async function load() {
    try {
      setErr(null);
      const fid = await getMyFamilyId();
      setFamilyId(fid);

      const b = await listBabies(fid);
      setBabies(b);

      const ro = await listUpcomingOccurrences(fid);
      const sorted = [...ro].sort(
        (a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime()
      );
      setItems(sorted);
    } catch (e: any) {
      setErr(e?.message ?? "Greška");
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () => (babyId ? items.filter((i) => i.baby_id === babyId) : items),
    [items, babyId]
  );

  const { todayList, tomorrowList, upcomingList } = useMemo(
    () => dayBuckets(filtered),
    [filtered]
  );

  async function addDailyVitamin() {
    if (!familyId) return;
    try {
      setErr(null);
      await createDailyVitaminDefinitionAndOccurrences(
        familyId,
        babyId || null,
        vitTitle,
        vitTime,
        14
      );
      await syncNativeNotificationsForFamily(familyId);
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "Greška pri dodavanju.");
    }
  }

  async function addOneOff() {
    if (!familyId) return;
    try {
      setErr(null);
      await createOneOffReminder(
        familyId,
        babyId || null,
        oneOffTitle,
        new Date(oneOffWhen).toISOString(),
        oneOffCategory as any
      );
      await syncNativeNotificationsForFamily(familyId);
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "Greška pri dodavanju.");
    }
  }

  async function done(id: string) {
    if (!familyId) return;
    try {
      setBusyId(id);
      setErr(null);
      await markOccurrenceDone(id);
      await syncNativeNotificationsForFamily(familyId);
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "Greška pri završavanju.");
    } finally {
      setBusyId(null);
    }
  }

  function openActions(r: ReminderOccurrence) {
    // samo za scheduled
    if (String((r as any).status) !== "scheduled") return;
    setActionFor(r);
    setEditWhen(new Date(r.scheduled_for));
  }

  async function doSnooze(min: number) {
    if (!actionFor || !familyId) return;
    try {
      setBusyId(actionFor.id);
      setErr(null);
      await snoozeOccurrence(actionFor.id, min);
      await syncNativeNotificationsForFamily(familyId);
      setActionFor(null);
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "Greška pri odlaganju.");
    } finally {
      setBusyId(null);
    }
  }

  async function doReschedule() {
    if (!actionFor || !familyId) return;
    try {
      setBusyId(actionFor.id);
      setErr(null);
      await rescheduleOccurrence(actionFor.id, editWhen.toISOString());
      await syncNativeNotificationsForFamily(familyId);
      setActionFor(null);
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "Greška pri izmeni vremena.");
    } finally {
      setBusyId(null);
    }
  }

  async function doCancel() {
    if (!actionFor || !familyId) return;
    const ok = confirm("Otkaži ovaj podsetnik?");
    if (!ok) return;

    try {
      setBusyId(actionFor.id);
      setErr(null);
      await cancelOccurrence(actionFor.id);
      await syncNativeNotificationsForFamily(familyId);
      setActionFor(null);
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "Greška pri otkazivanju.");
    } finally {
      setBusyId(null);
    }
  }

  function ReminderRow({ r }: { r: ReminderOccurrence }) {
    const cat = (r.category as any) as Cat;

    const statusStr = String((r as any).status);
    const isDone = statusStr === "done";
    const isCancelled = statusStr === "cancelled" || statusStr === "canceled";

    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-800">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-extrabold ${catBadgeClass(
                cat
              )}`}
            >
              {catLabel(cat)}
            </span>

            {isDone ? (
              <span className="text-[11px] font-extrabold text-green-600">ZAVRŠENO</span>
            ) : isCancelled ? (
              <span className="text-[11px] font-extrabold text-gray-500">OTKAZANO</span>
            ) : (
              <span className="text-[11px] font-semibold text-gray-500">{relTime(r.scheduled_for)}</span>
            )}
          </div>

          <div className="mt-1 truncate font-semibold">{r.title}</div>
          <div className="text-xs text-gray-500">
            {formatTime(r.scheduled_for)} • {formatDate(r.scheduled_for)}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isDone && !isCancelled && (
            <Button
              onClick={() => done(r.id)}
              className="px-3 py-2"
              disabled={busyId === r.id}
            >
              {busyId === r.id ? "…" : "Završeno"}
            </Button>
          )}

          {!isDone && !isCancelled && (
            <button
              type="button"
              className="rounded-lg px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-900"
              onClick={() => openActions(r)}
              aria-label="Opcije"
            >
              ⋮
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-semibold text-gray-500">Pogo Baby Log</div>
        <h1 className="text-2xl font-extrabold">Podsetnici</h1>
      </div>

      {err && <Card className="border-red-200 bg-red-50 text-red-700">{err}</Card>}

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

      {/* Quick add */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-extrabold">Brzo dodavanje</div>
          <Button variant="secondary" onClick={load}>
            Osveži
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-2">
          <div className="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
            <div className="text-xs font-semibold text-gray-500">
              Daily vitamini (kreira 14 podsetnika)
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Input value={vitTitle} onChange={(e) => setVitTitle(e.target.value)} />
              <Input value={vitTime} onChange={(e) => setVitTime(e.target.value)} type="time" />

            </div>
            <Button className="mt-2 w-full" onClick={addDailyVitamin}>
              Dodaj daily vitamin
            </Button>
          </div>

          <div className="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
            <div className="text-xs font-semibold text-gray-500">Jednokratni podsetnik</div>

            <div className="mt-2 grid grid-cols-1 gap-2">
              <Input value={oneOffTitle} onChange={(e) => setOneOffTitle(e.target.value)} />

              <div className="flex flex-wrap gap-2">
                {(["doctor", "meds", "vitamins", "care", "custom"] as Cat[]).map((c) => (
                  <Chip key={c} active={oneOffCategory === c} onClick={() => setOneOffCategory(c)}>
                    {catLabel(c)}
                  </Chip>
                ))}
              </div>

              <Input
                value={oneOffWhen}
                onChange={(e) => setOneOffWhen(e.target.value)}
                type="datetime-local"
              />
            </div>

            <Button variant="secondary" className="mt-2 w-full" onClick={addOneOff}>
              Dodaj jednokratni
            </Button>
          </div>
        </div>

        <div className="text-xs text-gray-500">
          Brzo dodavanje je za MVP/test. Kasnije pravimo full modal “Dodaj podsetnik”.
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div className="text-sm font-extrabold">Danas</div>
          <div className="text-xs text-gray-500">{todayList.length} stavki</div>
        </div>
        <div className="mt-3 space-y-2">
          {todayList.length ? todayList.map((r) => <ReminderRow key={r.id} r={r} />) : <div className="text-sm text-gray-500">Nema podsetnika za danas.</div>}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div className="text-sm font-extrabold">Sutra</div>
          <div className="text-xs text-gray-500">{tomorrowList.length} stavki</div>
        </div>
        <div className="mt-3 space-y-2">
          {tomorrowList.length ? tomorrowList.map((r) => <ReminderRow key={r.id} r={r} />) : <div className="text-sm text-gray-500">Nema podsetnika za sutra.</div>}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div className="text-sm font-extrabold">Uskoro</div>
          <div className="text-xs text-gray-500">{upcomingList.length} stavki</div>
        </div>
        <div className="mt-3 space-y-2">
          {upcomingList.length ? upcomingList.map((r) => <ReminderRow key={r.id} r={r} />) : <div className="text-sm text-gray-500">Nema podsetnika unapred.</div>}
        </div>
      </Card>

      {/* ACTION SHEET */}
      {actionFor && (
        <div className="fixed inset-0 z-50">
          <button
            className="absolute inset-0 bg-black/40"
            onClick={() => setActionFor(null)}
            aria-label="Close"
            type="button"
          />
          <div className="absolute inset-x-0" style={{ bottom: "calc(env(safe-area-inset-bottom) + 84px)" }}>
            <div className="mx-auto max-w-md rounded-2xl bg-white p-4 shadow-2xl dark:bg-gray-950 max-h-[75vh] overflow-y-auto">
              <div className="text-sm font-extrabold">Opcije</div>
              <div className="mt-1 text-xs text-gray-500">
                {actionFor.title} • {formatTime(actionFor.scheduled_for)}
              </div>

              <div className="mt-3 space-y-2">
                <div className="text-xs font-semibold text-gray-500">Odloži</div>
                <div className="grid grid-cols-3 gap-2">
                  <Button variant="secondary" onClick={() => doSnooze(10)} disabled={busyId === actionFor.id}>+10m</Button>
                  <Button variant="secondary" onClick={() => doSnooze(30)} disabled={busyId === actionFor.id}>+30m</Button>
                  <Button variant="secondary" onClick={() => doSnooze(60)} disabled={busyId === actionFor.id}>+60m</Button>
                </div>

                <div className="mt-2 text-xs font-semibold text-gray-500">Izmeni vreme</div>
                <input
                  type="datetime-local"
                  value={toLocalDateTimeInputValue(editWhen)}
                  onChange={(e) => setEditWhen(new Date(e.target.value))}
                  className="mt-1 w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none dark:border-gray-800 dark:bg-gray-950"
                />
                <Button onClick={doReschedule} disabled={busyId === actionFor.id} className="w-full">
                  {busyId === actionFor.id ? "…" : "Sačuvaj vreme"}
                </Button>

                <Button variant="secondary" onClick={doCancel} className="w-full" disabled={busyId === actionFor.id}>
                  Otkaži podsetnik
                </Button>

                <Button variant="ghost" onClick={() => setActionFor(null)} className="w-full">
                  Zatvori
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
