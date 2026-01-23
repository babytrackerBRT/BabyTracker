"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import type { Baby } from "@/types/db";
import { supabase } from "@/lib/supabase/client";

type FeedingMode = "formula" | "breast" | "solid";

function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function toLocalDateTimeInputValue(d: Date) {
  // YYYY-MM-DDTHH:mm (local)
  const yyyy = d.getFullYear();
  const mm = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  const hh = pad2(d.getHours());
  const mi = pad2(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

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

function fmtTime(d: Date) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const AAP_LINK =
  "https://www.healthychildren.org/English/ages-stages/baby/feeding-nutrition/Pages/how-often-and-how-much-should-your-baby-eat.aspx";

export function FeedingModal({
  open,
  onClose,
  babies,
  initialBabyId,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  babies: Baby[];
  initialBabyId?: string;
  onSave: (payload: {
    babyId: string;
    mode: FeedingMode;
    occurredAt: string; // ISO
    amountMl?: number;
    note?: string;
    data?: Record<string, any>;
  }) => Promise<void>;
}) {
  const firstBabyId = babies[0]?.id ?? "";

  const [babyId, setBabyId] = useState(initialBabyId || firstBabyId);
  const [mode, setMode] = useState<FeedingMode>("formula");

  // time
  const [when, setWhen] = useState<Date>(new Date());

  // formula
  const [amount, setAmount] = useState<number>(90);
  const [customAmount, setCustomAmount] = useState<string>("");

  // breast
  const [side, setSide] = useState<"left" | "right" | "both">("both");
  const [durationMin, setDurationMin] = useState<number>(10);

  // solid
  const [food, setFood] = useState<string>("");

  // common
  const [note, setNote] = useState<string>("");
  const [more, setMore] = useState<boolean>(false);
  const [busy, setBusy] = useState<boolean>(false);
  const [err, setErr] = useState<string | null>(null);

  // heads-up interval settings loaded from DB
  const [intervalMin, setIntervalMin] = useState<number>(165);
  const [intervalSource, setIntervalSource] = useState<"recommended" | "custom">("recommended");

  useEffect(() => {
    if (!open) return;
    setErr(null);
    setBusy(false);
    setBabyId(initialBabyId || firstBabyId);
    setMode("formula");
    setWhen(new Date());
    setAmount(90);
    setCustomAmount("");
    setSide("both");
    setDurationMin(10);
    setFood("");
    setNote("");
    setMore(false);
  }, [open, initialBabyId, firstBabyId]);

  // fetch baby interval config when modal opens / baby changes
  useEffect(() => {
    if (!open) return;
    if (!babyId) return;

    (async () => {
      try {
        const { data, error } = await supabase
          .from("babies")
          .select("birth_date,use_recommended_interval,feeding_interval_minutes")
          .eq("id", babyId)
          .single();

        if (error) throw error;

        const useRec = (data as any)?.use_recommended_interval !== false;
        const custom = (data as any)?.feeding_interval_minutes;

        if (!useRec && typeof custom === "number" && Number.isFinite(custom)) {
          setIntervalSource("custom");
          setIntervalMin(custom);
        } else {
          setIntervalSource("recommended");
          setIntervalMin(recommendedIntervalMinutes((data as any)?.birth_date ?? null));
        }
      } catch {
        // fallback (ne rušimo modal)
        setIntervalSource("recommended");
        setIntervalMin(165);
      }
    })();
  }, [open, babyId]);

  const canSave = useMemo(() => {
    if (!babyId || busy) return false;
    if (mode === "formula") {
      const n = customAmount.trim() ? Number(customAmount) : amount;
      return Number.isFinite(n) && n > 0;
    }
    if (mode === "solid") {
      return food.trim().length > 0;
    }
    // breast always ok
    return true;
  }, [babyId, busy, mode, amount, customAmount, food]);

  function applyDeltaMinutes(delta: number) {
    setWhen((prev) => new Date(prev.getTime() + delta * 60_000));
  }

  const prepMin = Math.max(0, intervalMin - 15);

  const prepAt = useMemo(() => new Date(when.getTime() + prepMin * 60_000), [when, prepMin]);
  const dueAt = useMemo(() => new Date(when.getTime() + intervalMin * 60_000), [when, intervalMin]);

  async function handleSave() {
    if (!canSave) return;
    setBusy(true);
    setErr(null);

    try {
      const occurredAtIso = new Date(when).toISOString();

      if (mode === "formula") {
        const n = customAmount.trim() ? Number(customAmount) : amount;
        await onSave({
          babyId,
          mode,
          occurredAt: occurredAtIso,
          amountMl: n,
          note: note.trim() || undefined,
        });
      } else if (mode === "breast") {
        await onSave({
          babyId,
          mode,
          occurredAt: occurredAtIso,
          note: note.trim() || undefined,
          data: {
            side,
            duration_min: durationMin,
          },
        });
      } else {
        // solid
        await onSave({
          babyId,
          mode,
          occurredAt: occurredAtIso,
          note: note.trim() || undefined,
          data: {
            food: food.trim(),
          },
        });
      }

      onClose();
    } catch (e: any) {
      setErr(e?.message ?? "Greška pri čuvanju.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* backdrop */}
      <button
        className="absolute inset-0 bg-black/40"
        aria-label="Zatvori"
        onClick={onClose}
        type="button"
      />

      {/* sheet */}
      <div
        className="absolute inset-x-0"
        style={{
          bottom: "calc(env(safe-area-inset-bottom) + 84px)", // 84px ~ tab bar
        }}
      >
        <div className="mx-auto max-w-md rounded-t-3xl bg-white p-4 shadow-2xl dark:bg-gray-950 max-h-[70vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <div className="text-base font-extrabold">Hranjenje</div>
            <button
              onClick={onClose}
              type="button"
              className="rounded-full px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-900"
            >
              Zatvori
            </button>
          </div>

          {/* baby picker */}
          <div className="mt-3">
            <div className="text-xs font-semibold text-gray-500">Beba</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {babies.map((b) => (
                <Chip key={b.id} active={b.id === babyId} onClick={() => setBabyId(b.id)}>
                  {b.name}
                </Chip>
              ))}
            </div>
          </div>

          {/* 🔥 Heads-up */}
          <Card className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-extrabold">Šta će biti zakazano</div>
              {intervalSource === "recommended" && (
                <a
                  href={AAP_LINK}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-brand-700"
                >
                  Prikaži više
                </a>
              )}
            </div>

            <div className="text-xs text-gray-500">
              Interval: <span className="font-semibold">{intervalMin} min</span>{" "}
              {intervalSource === "recommended" ? "(preporučeno)" : "(custom)"}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-800">
                <div className="text-xs font-semibold text-gray-500">Pripremi obrok</div>
                <div className="mt-1 text-base font-extrabold">{fmtTime(prepAt)}</div>
                <div className="text-[11px] text-gray-500">{prepMin} min posle</div>
              </div>

              <div className="rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-800">
                <div className="text-xs font-semibold text-gray-500">Sledeće hranjenje</div>
                <div className="mt-1 text-base font-extrabold">{fmtTime(dueAt)}</div>
                <div className="text-[11px] text-gray-500">{intervalMin} min posle</div>
              </div>
            </div>

            <div className="text-[11px] text-gray-500">
              Ovo je informativno. Ako pedijatar kaže drugačije, prati pedijatra.
            </div>
          </Card>

          {/* mode */}
          <div className="mt-4">
            <div className="text-xs font-semibold text-gray-500">Tip</div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <Button variant={mode === "formula" ? "primary" : "secondary"} onClick={() => setMode("formula")}>
                Formula
              </Button>
              <Button variant={mode === "breast" ? "primary" : "secondary"} onClick={() => setMode("breast")}>
                Dojenje
              </Button>
              <Button variant={mode === "solid" ? "primary" : "secondary"} onClick={() => setMode("solid")}>
                Čvrsta
              </Button>
            </div>
          </div>

          {/* time */}
          <div className="mt-4">
            <div className="text-xs font-semibold text-gray-500">Vreme</div>
            <Card className="mt-2 space-y-3">
              <div className="grid grid-cols-4 gap-2">
                <Button variant="secondary" onClick={() => applyDeltaMinutes(-15)}>
                  -15m
                </Button>
                <Button variant="secondary" onClick={() => applyDeltaMinutes(-5)}>
                  -5m
                </Button>
                <Button variant="secondary" onClick={() => applyDeltaMinutes(5)}>
                  +5m
                </Button>
                <Button variant="secondary" onClick={() => applyDeltaMinutes(15)}>
                  +15m
                </Button>
              </div>

              <div>
                <label className="text-sm font-semibold">Precizno vreme</label>
                <input
                  type="datetime-local"
                  value={toLocalDateTimeInputValue(when)}
                  onChange={(e) => setWhen(new Date(e.target.value))}
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none dark:border-gray-800 dark:bg-gray-950"
                />
                <div className="mt-1 text-[11px] text-gray-500">
                  Podrazumevano je “sada”, ali možeš da pomeriš vreme.
                </div>
              </div>
            </Card>
          </div>

          {/* mode-specific */}
          {mode === "formula" && (
            <div className="mt-4">
              <div className="text-xs font-semibold text-gray-500">Količina (ml)</div>
              <div className="mt-2 grid grid-cols-5 gap-2">
                {[60, 90, 120, 150, 180].map((v) => (
                  <Button
                    key={v}
                    variant={!customAmount.trim() && amount === v ? "primary" : "secondary"}
                    onClick={() => {
                      setCustomAmount("");
                      setAmount(v);
                    }}
                  >
                    {v}
                  </Button>
                ))}
              </div>

              <Card className="mt-3">
                <label className="text-sm font-semibold">Custom</label>
                <input
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  inputMode="numeric"
                  placeholder="npr. 110"
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none dark:border-gray-800 dark:bg-gray-950"
                />
                <div className="mt-1 text-[11px] text-gray-500">
                  Ako upišeš broj ovde, on ima prioritet nad preset vrednostima.
                </div>
              </Card>
            </div>
          )}

          {mode === "breast" && (
            <div className="mt-4">
              <div className="text-xs font-semibold text-gray-500">Detalji</div>
              <Card className="mt-2 space-y-3">
                <div>
                  <div className="text-sm font-semibold">Strana</div>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <Button variant={side === "left" ? "primary" : "secondary"} onClick={() => setSide("left")}>
                      Leva
                    </Button>
                    <Button variant={side === "right" ? "primary" : "secondary"} onClick={() => setSide("right")}>
                      Desna
                    </Button>
                    <Button variant={side === "both" ? "primary" : "secondary"} onClick={() => setSide("both")}>
                      Obe
                    </Button>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-semibold">Trajanje (min)</div>
                  <div className="mt-2 grid grid-cols-5 gap-2">
                    {[5, 10, 15, 20, 25].map((v) => (
                      <Button
                        key={v}
                        variant={durationMin === v ? "primary" : "secondary"}
                        onClick={() => setDurationMin(v)}
                      >
                        {v}
                      </Button>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          )}

          {mode === "solid" && (
            <div className="mt-4">
              <div className="text-xs font-semibold text-gray-500">Šta je jela</div>
              <Card className="mt-2">
                <label className="text-sm font-semibold">Namirnica / obrok</label>
                <input
                  value={food}
                  onChange={(e) => setFood(e.target.value)}
                  placeholder="npr. banana, kašica..."
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none dark:border-gray-800 dark:bg-gray-950"
                />
                <div className="mt-1 text-[11px] text-gray-500">Dovoljno je kratko (npr. “banana”).</div>
              </Card>
            </div>
          )}

          {/* more */}
          <div className="mt-4">
            <button
              type="button"
              className="text-sm font-semibold text-brand-700"
              onClick={() => setMore((v) => !v)}
            >
              {more ? "Sakrij napomenu" : "Napomena"}
            </button>

            {more && (
              <Card className="mt-3">
                <div className="text-sm font-semibold">Napomena</div>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Opcionalno..."
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none dark:border-gray-800 dark:bg-gray-950"
                  rows={3}
                />
              </Card>
            )}
          </div>

          {err && (
            <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
              {err}
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={onClose}>
              Otkaži
            </Button>
            <Button onClick={handleSave} disabled={!canSave}>
              {busy ? "Čuvam…" : "Sačuvaj"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
