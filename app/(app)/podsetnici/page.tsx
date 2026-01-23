// app/(app)/podsetnici/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Input } from "@/components/ui/Input";
import { getMyFamilyId, listBabies } from "@/lib/data/family";
import {
  createDailyVitaminDefinitionAndOccurrences,
  createOneOffReminder,
  listUpcomingOccurrences,
  markOccurrenceDone,
  syncNativeNotificationsForFamily,
} from "@/lib/data/reminders";
import type { Baby, ReminderOccurrence } from "@/types/db";
import { formatDate, formatTime } from "@/lib/utils";

export default function RemindersPage() {
  const [familyId, setFamilyId] = useState("");
  const [babies, setBabies] = useState<Baby[]>([]);
  const [babyId, setBabyId] = useState<string>(""); // filter, ""=all
  const [items, setItems] = useState<ReminderOccurrence[]>([]);
  const [err, setErr] = useState<string | null>(null);

  // quick add form (MVP)
  const [title, setTitle] = useState("Vitamin D");
  const [time, setTime] = useState("18:00");
  const [oneOffTitle, setOneOffTitle] = useState("Pedijatar");
  const [oneOffWhen, setOneOffWhen] = useState(() => new Date().toISOString().slice(0, 16));

  async function load() {
    try {
      setErr(null);
      const fid = await getMyFamilyId();
      setFamilyId(fid);
      const b = await listBabies(fid);
      setBabies(b);
      const ro = await listUpcomingOccurrences(fid);
      setItems(ro);
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

  async function addDailyVitamin() {
    if (!familyId) return;
    await createDailyVitaminDefinitionAndOccurrences(familyId, babyId || null, title, time, 14);
    await syncNativeNotificationsForFamily(familyId);
    await load();
  }

  async function addOneOff() {
    if (!familyId) return;
    await createOneOffReminder(
      familyId,
      babyId || null,
      oneOffTitle,
      new Date(oneOffWhen).toISOString(),
      "doctor"
    );
    await syncNativeNotificationsForFamily(familyId);
    await load();
  }

  async function done(id: string) {
    await markOccurrenceDone(id);
    if (familyId) await syncNativeNotificationsForFamily(familyId);
    await load();
  }

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startOfTomorrow = startOfToday + 24 * 60 * 60 * 1000;
  const startOfDayAfter = startOfTomorrow + 24 * 60 * 60 * 1000;

  const todayList = filtered.filter((i) => {
    const t = new Date(i.scheduled_for).getTime();
    return t >= startOfToday && t < startOfTomorrow;
  });

  const tomorrowList = filtered.filter((i) => {
    const t = new Date(i.scheduled_for).getTime();
    return t >= startOfTomorrow && t < startOfDayAfter;
  });

  const upcomingList = filtered
    .filter((i) => new Date(i.scheduled_for).getTime() >= startOfDayAfter)
    .slice(0, 20);

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

      <Card className="space-y-3">
        <div className="text-sm font-extrabold">Brzo dodavanje (za test)</div>

        <div className="grid grid-cols-1 gap-2">
          <div className="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
            <div className="text-xs font-semibold text-gray-500">
              Daily vitamin (kreira 14 podsetnika)
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              <Input value={time} onChange={(e) => setTime(e.target.value)} placeholder="18:00" />
            </div>
            <Button className="mt-2 w-full" onClick={addDailyVitamin}>
              Dodaj daily vitamin
            </Button>
          </div>

          <div className="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
            <div className="text-xs font-semibold text-gray-500">Jednokratni podsetnik (doktor)</div>
            <div className="mt-2 grid grid-cols-1 gap-2">
              <Input value={oneOffTitle} onChange={(e) => setOneOffTitle(e.target.value)} />
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
          Ovo je funkcionalno i odmah puni Supabase. UI posle ide “full” kao mockup.
        </div>
      </Card>

      <Card>
        <div className="text-sm font-extrabold">Danas</div>
        <div className="mt-3 space-y-2">
          {todayList.length ? (
            todayList.map((r) => (
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

                {r.status !== "done" ? (
                  <Button className="px-3 py-2" onClick={() => done(r.id)}>
                    Završeno
                  </Button>
                ) : (
                  <div className="text-xs font-semibold text-green-600">DONE</div>
                )}
              </div>
            ))
          ) : (
            <div className="text-sm text-gray-500">Nema podsetnika za danas.</div>
          )}
        </div>
      </Card>

      <Card>
        <div className="text-sm font-extrabold">Sutra</div>
        <div className="mt-3 space-y-2">
          {tomorrowList.length ? (
            tomorrowList.map((r) => (
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
            <div className="text-sm text-gray-500">Nema podsetnika za sutra.</div>
          )}
        </div>
      </Card>

      <Card>
        <div className="text-sm font-extrabold">Uskoro</div>
        <div className="mt-3 space-y-2">
          {upcomingList.length ? (
            upcomingList.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-800"
              >
                <div className="min-w-0">
                  <div className="truncate font-semibold">{r.title}</div>
                  <div className="text-xs text-gray-500">
                    {formatDate(r.scheduled_for)} • {formatTime(r.scheduled_for)} • {r.category}
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
    </div>
  );
}
