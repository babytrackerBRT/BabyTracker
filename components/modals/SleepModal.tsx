"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import type { Baby } from "@/types/db";

type SleepQuality = "good" | "normal" | "restless";

function msToHhMm(ms: number) {
  const totalMin = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `${m} min`;
  return `${h}h ${m}m`;
}

export function SleepModal({
  open,
  onClose,
  babies,
  initialBabyId,
  getActiveSession,
  startSleep,
  stopSleep,
}: {
  open: boolean;
  onClose: () => void;
  babies: Baby[];
  initialBabyId?: string;

  getActiveSession: (babyId: string) => Promise<{ id: string; started_at: string } | null>;
  startSleep: (babyId: string) => Promise<void>;
  stopSleep: (sessionId: string, payload: { quality?: SleepQuality; note?: string }) => Promise<void>;
}) {
  const firstBabyId = babies[0]?.id ?? "";
  const [babyId, setBabyId] = useState(initialBabyId || firstBabyId);

  const [active, setActive] = useState<{ id: string; started_at: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [quality, setQuality] = useState<SleepQuality>("normal");
  const [note, setNote] = useState("");
  const [more, setMore] = useState(false);

  async function refreshActive(bId: string) {
    setErr(null);
    try {
      const s = await getActiveSession(bId);
      setActive(s);
    } catch (e: any) {
      setErr(e?.message ?? "Greška");
      setActive(null);
    }
  }

  useEffect(() => {
    if (!open) return;
    const bId = initialBabyId || firstBabyId;
    setBabyId(bId);
    setBusy(false);
    setErr(null);
    setQuality("normal");
    setNote("");
    setMore(false);
    refreshActive(bId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialBabyId, firstBabyId]);

  useEffect(() => {
    if (!open) return;
    if (!babyId) return;
    refreshActive(babyId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [babyId]);

  const durationLabel = useMemo(() => {
    if (!active?.started_at) return "";
    const started = new Date(active.started_at).getTime();
    return msToHhMm(Date.now() - started);
  }, [active]);

  async function onStart() {
    if (!babyId || busy) return;
    setBusy(true);
    setErr(null);
    try {
      await startSleep(babyId);
      await refreshActive(babyId);
    } catch (e: any) {
      setErr(e?.message ?? "Greška pri startu.");
    } finally {
      setBusy(false);
    }
  }

  async function onStop() {
    if (!active?.id || busy) return;
    setBusy(true);
    setErr(null);
    try {
      await stopSleep(active.id, {
        quality,
        note: note.trim() || undefined,
      });
      await refreshActive(babyId);
      onClose();
    } catch (e: any) {
      setErr(e?.message ?? "Greška pri završetku.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        className="absolute inset-0 bg-black/40"
        aria-label="Zatvori"
        onClick={onClose}
        type="button"
      />

      {/* ✅ podignuto iznad bottom tabs + safe-area */}
      <div
        className="absolute inset-x-0"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 84px)" }}
      >
        <div className="mx-auto max-w-md rounded-t-3xl bg-white p-4 shadow-2xl dark:bg-gray-950 max-h-[72vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <div className="text-base font-extrabold">Spavanje</div>
            <button
              onClick={onClose}
              type="button"
              className="rounded-full px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-900"
            >
              Zatvori
            </button>
          </div>

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

          <div className="mt-4">
            <div className="text-xs font-semibold text-gray-500">Status</div>
            <Card className="mt-2">
              {active ? (
                <div className="space-y-1">
                  <div className="text-sm font-semibold">Spava</div>
                  <div className="text-xs text-gray-500">
                    Počelo:{" "}
                    {new Date(active.started_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {" • "}
                    Traje: {durationLabel}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-600">Trenutno ne spava.</div>
              )}
            </Card>
          </div>

          {!active ? (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={onClose}>
                Otkaži
              </Button>
              <Button onClick={onStart} disabled={busy || !babyId}>
                {busy ? "Pokrećem…" : "Počni spavanje"}
              </Button>
            </div>
          ) : (
            <>
              <div className="mt-4">
                <div className="text-xs font-semibold text-gray-500">Kvalitet</div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <Button
                    variant={quality === "good" ? "primary" : "secondary"}
                    onClick={() => setQuality("good")}
                  >
                    Mirno
                  </Button>
                  <Button
                    variant={quality === "normal" ? "primary" : "secondary"}
                    onClick={() => setQuality("normal")}
                  >
                    Normalno
                  </Button>
                  <Button
                    variant={quality === "restless" ? "primary" : "secondary"}
                    onClick={() => setQuality("restless")}
                  >
                    Nemirno
                  </Button>
                </div>

                <div className="mt-3">
                  <button
                    type="button"
                    className="text-sm font-semibold text-brand-700"
                    onClick={() => setMore((v) => !v)}
                  >
                    {more ? "Sakrij napomenu" : "Napomena"}
                  </button>

                  {more && (
                    <Card className="mt-2">
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Opcionalno..."
                        className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none dark:border-gray-800 dark:bg-gray-950"
                        rows={3}
                      />
                    </Card>
                  )}
                </div>
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
                <Button onClick={onStop} disabled={busy}>
                  {busy ? "Završavam…" : "Završi spavanje"}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
