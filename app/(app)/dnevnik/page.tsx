"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Chip } from "@/components/ui/Chip";

import { getMyFamilyId, listBabies } from "@/lib/data/family";
import { listRecentEvents, deleteEvent, updateEvent } from "@/lib/data/events";
import { listRecentSleepSessions, type SleepSessionRow } from "@/lib/data/sleep";

import type { Baby, EventRow } from "@/types/db";
import { formatDate, formatTime } from "@/lib/utils";

type TimelineItem =
  | { kind: "event"; occurred_at: string; item: EventRow }
  | { kind: "sleep"; occurred_at: string; item: SleepSessionRow };

function toLocalDateTimeInputValue(d: Date) {
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function dayKeyFromIso(iso: string) {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getDayLabel(key: string) {
  const [yyyy, mm, dd] = key.split("-").map((x) => parseInt(x, 10));
  const d = new Date(yyyy, (mm || 1) - 1, dd || 1);
  const now = new Date();
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);

  if (isSameDay(d, now)) return "Danas";
  if (isSameDay(d, yesterday)) return "Juče";
  return formatDate(d.toISOString());
}

function prettyTypeEvent(e: EventRow) {
  if (e.type === "feeding") return "Hranjenje";
  if (e.type === "diaper") return "Pelena";
  return e.type;
}

function msToHhMm(ms: number) {
  const totalMin = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `${m} min`;
  return `${h}h ${m}m`;
}

export default function DnevnikPage() {
  const [familyId, setFamilyId] = useState("");
  const [babies, setBabies] = useState<Baby[]>([]);
  const [babyId, setBabyId] = useState<string>(""); // "" = all

  const [events, setEvents] = useState<EventRow[]>([]);
  const [sleepSessions, setSleepSessions] = useState<SleepSessionRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // action sheet (events only for now)
  const [actionFor, setActionFor] = useState<EventRow | null>(null);

  // edit modal state (events only)
  const [editOpen, setEditOpen] = useState(false);
  const [editEventId, setEditEventId] = useState<string>("");
  const [editWhen, setEditWhen] = useState<Date>(new Date());
  const [editNote, setEditNote] = useState<string>("");

  const [editKind, setEditKind] = useState<"feeding" | "diaper" | null>(null);

  const [editFeedingMode, setEditFeedingMode] = useState<"formula" | "breast" | "solid">("formula");
  const [editAmount, setEditAmount] = useState<string>("90");

  const [editDiaperKind, setEditDiaperKind] = useState<"wet" | "poop" | "mixed">("wet");
  const [editRash, setEditRash] = useState(false);
  const [editCream, setEditCream] = useState(false);

  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setErr(null);
      const fid = await getMyFamilyId();
      setFamilyId(fid);

      const b = await listBabies(fid);
      setBabies(b);

      const ev = await listRecentEvents(fid, 300);
      setEvents(ev);

      const ss = await listRecentSleepSessions(fid, 200);
      setSleepSessions(ss);
    } catch (e: any) {
      setErr(e?.message ?? "Greška");
    }
  }

  useEffect(() => {
    load();
  }, []);

  const timeline = useMemo(() => {
    const q = query.trim().toLowerCase();
    const fromTs = from ? new Date(from).getTime() : null;
    const toTs = to ? new Date(to).getTime() + 24 * 60 * 60 * 1000 - 1 : null;

    const items: TimelineItem[] = [];

    for (const e of events) {
      if (babyId && e.baby_id !== babyId) continue;

      const ts = new Date(e.occurred_at).getTime();
      if (fromTs && ts < fromTs) continue;
      if (toTs && ts > toTs) continue;

      if (q) {
        const blob = [
          e.type,
          e.feeding_mode,
          e.diaper_kind,
          e.note,
          e.amount_ml?.toString(),
          JSON.stringify(e.data ?? {}),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!blob.includes(q)) continue;
      }

      items.push({ kind: "event", occurred_at: e.occurred_at, item: e });
    }

    for (const s of sleepSessions) {
      if (babyId && s.baby_id !== babyId) continue;

      const ts = new Date(s.started_at).getTime();
      if (fromTs && ts < fromTs) continue;
      if (toTs && ts > toTs) continue;

      if (q) {
        const blob = [
          "sleep",
          s.quality ?? "",
          s.note ?? "",
        ].join(" ").toLowerCase();

        if (!blob.includes(q)) continue;
      }

      items.push({ kind: "sleep", occurred_at: s.started_at, item: s });
    }

    // newest first
    items.sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());
    return items;
  }, [events, sleepSessions, babyId, query, from, to]);

  const grouped = useMemo(() => {
    const map = new Map<string, TimelineItem[]>();
    for (const it of timeline) {
      const k = dayKeyFromIso(it.occurred_at);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(it);
    }
    const keys = Array.from(map.keys()).sort((a, b) => (a > b ? -1 : 1));
    return keys.map((k) => ({
      key: k,
      label: getDayLabel(k),
      items: (map.get(k) ?? []).sort(
        (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
      ),
    }));
  }, [timeline]);

  function openActions(e: EventRow) {
    setActionFor(e);
  }

  async function onDelete(e: EventRow) {
    const ok = confirm(`Obriši unos: ${prettyTypeEvent(e)} u ${formatTime(e.occurred_at)}?`);
    if (!ok) return;

    try {
      setBusy(true);
      await deleteEvent(e.id);
      setActionFor(null);
      await load();
    } catch (ex: any) {
      setErr(ex?.message ?? "Greška pri brisanju.");
    } finally {
      setBusy(false);
    }
  }

  function openEdit(e: EventRow) {
    setActionFor(null);
    setEditEventId(e.id);
    setEditWhen(new Date(e.occurred_at));
    setEditNote(e.note ?? "");

    if (e.type === "feeding") {
      setEditKind("feeding");
      setEditFeedingMode((e.feeding_mode as any) || "formula");
      setEditAmount(e.amount_ml != null ? String(e.amount_ml) : "");
      setEditOpen(true);
      return;
    }

    if (e.type === "diaper") {
      setEditKind("diaper");
      setEditDiaperKind((e.diaper_kind as any) || "wet");
      setEditRash(!!(e.data as any)?.rash);
      setEditCream(!!(e.data as any)?.cream);
      setEditOpen(true);
      return;
    }

    alert("Edit za ovaj tip unosa dodajemo uskoro.");
  }

  async function saveEdit() {
    if (!editEventId || !editKind) return;

    try {
      setBusy(true);

      if (editKind === "feeding") {
        const ml = editAmount.trim() ? Number(editAmount) : null;
        if (editFeedingMode === "formula" && (!ml || !Number.isFinite(ml) || ml <= 0)) {
          setErr("Unesi ispravnu količinu (ml).");
          return;
        }

        await updateEvent(editEventId, {
          occurred_at: editWhen.toISOString(),
          note: editNote.trim() || null,
          feeding_mode: editFeedingMode,
          amount_ml: editFeedingMode === "formula" ? ml : null,
        } as any);
      }

      if (editKind === "diaper") {
        await updateEvent(editEventId, {
          occurred_at: editWhen.toISOString(),
          note: editNote.trim() || null,
          diaper_kind: editDiaperKind,
          data: { rash: editRash, cream: editCream },
        } as any);
      }

      setEditOpen(false);
      setEditKind(null);
      setEditEventId("");
      await load();
    } catch (ex: any) {
      setErr(ex?.message ?? "Greška pri izmeni.");
    } finally {
      setBusy(false);
    }
  }

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
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="npr. formula, mokra, sleep..."
            />
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

      {grouped.length ? (
        grouped.map((g) => (
          <Card key={g.key}>
            <div className="flex items-center justify-between">
              <div className="text-sm font-extrabold">
                {g.label} <span className="text-xs text-gray-500">({g.key})</span>
              </div>
              <div className="text-xs text-gray-500">{g.items.length} stavki</div>
            </div>

            <div className="mt-3 space-y-2">
              {g.items.map((it) => {
                if (it.kind === "sleep") {
                  const s = it.item;
                  const end = s.ended_at ? new Date(s.ended_at).getTime() : null;
                  const dur = end ? msToHhMm(end - new Date(s.started_at).getTime()) : "u toku";

                  return (
                    <div
                      key={`sleep-${s.id}`}
                      className="rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-800"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold truncate">Spavanje</div>
                          <div className="text-xs text-gray-500">
                            {formatTime(s.started_at)} • trajanje: {dur}
                            {s.quality ? ` • ${s.quality}` : ""}
                          </div>
                        </div>
                        <div className="text-xs font-semibold text-gray-500">sleep</div>
                      </div>

                      {s.note && <div className="mt-2 text-sm">{s.note}</div>}
                    </div>
                  );
                }

                const e = it.item;

                return (
                  <div
                    key={`event-${e.id}`}
                    className="rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-800"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{prettyTypeEvent(e)}</div>
                        <div className="text-xs text-gray-500">
                          {formatTime(e.occurred_at)}
                          {e.feeding_mode ? ` • ${e.feeding_mode}` : ""}
                          {typeof e.amount_ml === "number" ? ` • ${e.amount_ml} ml` : ""}
                          {e.diaper_kind ? ` • ${e.diaper_kind}` : ""}
                        </div>
                      </div>

                      <button
                        type="button"
                        className="rounded-lg px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-900"
                        onClick={() => openActions(e)}
                      >
                        ⋮
                      </button>
                    </div>

                    {e.note && <div className="mt-2 text-sm">{e.note}</div>}
                  </div>
                );
              })}
            </div>
          </Card>
        ))
      ) : (
        <Card>
          <div className="text-sm text-gray-500">Nema unosa.</div>
        </Card>
      )}

      {/* ACTION SHEET (events) */}
      {actionFor && (
        <div className="fixed inset-0 z-50">
          <button
            className="absolute inset-0 bg-black/40"
            onClick={() => setActionFor(null)}
            aria-label="Close"
            type="button"
          />
          <div className="absolute inset-x-0" style={{ bottom: "calc(env(safe-area-inset-bottom) + 84px)" }}>
            <div className="mx-auto max-w-md rounded-2xl bg-white p-4 shadow-2xl dark:bg-gray-950">
              <div className="text-sm font-extrabold">Opcije</div>
              <div className="mt-1 text-xs text-gray-500">
                {prettyTypeEvent(actionFor)} • {formatTime(actionFor.occurred_at)}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button variant="secondary" onClick={() => openEdit(actionFor)}>
                  Izmeni
                </Button>
                <Button onClick={() => onDelete(actionFor)} disabled={busy}>
                  Obriši
                </Button>
              </div>

              <Button className="mt-2 w-full" variant="ghost" onClick={() => setActionFor(null)}>
                Zatvori
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL (events) */}
      {editOpen && editKind && (
        <div className="fixed inset-0 z-50">
          <button
            className="absolute inset-0 bg-black/40"
            onClick={() => setEditOpen(false)}
            aria-label="Close"
            type="button"
          />
          <div className="absolute inset-x-0" style={{ bottom: "calc(env(safe-area-inset-bottom) + 84px)" }}>
            <div className="mx-auto max-w-md rounded-2xl bg-white p-4 shadow-2xl dark:bg-gray-950 max-h-[75vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <div className="text-base font-extrabold">Izmena</div>
                <button
                  className="rounded-full px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-900"
                  onClick={() => setEditOpen(false)}
                  type="button"
                >
                  Zatvori
                </button>
              </div>

              <div className="mt-3">
                <div className="text-xs font-semibold text-gray-500">Vreme</div>
                <input
                  type="datetime-local"
                  value={toLocalDateTimeInputValue(editWhen)}
                  onChange={(e) => setEditWhen(new Date(e.target.value))}
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none dark:border-gray-800 dark:bg-gray-950"
                />
              </div>

              {editKind === "feeding" && (
                <div className="mt-4 space-y-3">
                  <div className="text-xs font-semibold text-gray-500">Tip</div>
                  <div className="grid grid-cols-3 gap-2">
                    <Button variant={editFeedingMode === "formula" ? "primary" : "secondary"} onClick={() => setEditFeedingMode("formula")}>
                      Formula
                    </Button>
                    <Button variant={editFeedingMode === "breast" ? "primary" : "secondary"} onClick={() => setEditFeedingMode("breast")}>
                      Dojenje
                    </Button>
                    <Button variant={editFeedingMode === "solid" ? "primary" : "secondary"} onClick={() => setEditFeedingMode("solid")}>
                      Čvrsta
                    </Button>
                  </div>

                  {editFeedingMode === "formula" && (
                    <div>
                      <div className="text-xs font-semibold text-gray-500">Količina (ml)</div>
                      <Input value={editAmount} onChange={(e) => setEditAmount(e.target.value)} placeholder="npr. 90" inputMode="numeric" />
                    </div>
                  )}
                </div>
              )}

              {editKind === "diaper" && (
                <div className="mt-4 space-y-3">
                  <div className="text-xs font-semibold text-gray-500">Tip</div>
                  <div className="grid grid-cols-3 gap-2">
                    <Button variant={editDiaperKind === "wet" ? "primary" : "secondary"} onClick={() => setEditDiaperKind("wet")}>
                      Mokra
                    </Button>
                    <Button variant={editDiaperKind === "poop" ? "primary" : "secondary"} onClick={() => setEditDiaperKind("poop")}>
                      Velika
                    </Button>
                    <Button variant={editDiaperKind === "mixed" ? "primary" : "secondary"} onClick={() => setEditDiaperKind("mixed")}>
                      Obe
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button variant={editRash ? "primary" : "secondary"} onClick={() => setEditRash((v) => !v)}>
                      Osip: {editRash ? "Da" : "Ne"}
                    </Button>
                    <Button variant={editCream ? "primary" : "secondary"} onClick={() => setEditCream((v) => !v)}>
                      Krema: {editCream ? "Da" : "Ne"}
                    </Button>
                  </div>
                </div>
              )}

              <div className="mt-4">
                <div className="text-xs font-semibold text-gray-500">Napomena</div>
                <textarea
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="Opcionalno..."
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none dark:border-gray-800 dark:bg-gray-950"
                  rows={3}
                />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button variant="secondary" onClick={() => setEditOpen(false)}>
                  Otkaži
                </Button>
                <Button onClick={saveEdit} disabled={busy}>
                  {busy ? "Čuvam…" : "Sačuvaj"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
