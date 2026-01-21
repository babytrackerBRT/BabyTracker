"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import type { Baby } from "@/types/db";

type DiaperKind = "wet" | "poop" | "mixed";

export function DiaperModal({
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
    kind: DiaperKind;
    rash: boolean;
    cream: boolean;
    note: string;
  }) => Promise<void>;
}) {
  const firstBabyId = babies[0]?.id ?? "";
  const [babyId, setBabyId] = useState(initialBabyId || firstBabyId);
  const [kind, setKind] = useState<DiaperKind>("wet");
  const [rash, setRash] = useState(false);
  const [cream, setCream] = useState(false);
  const [note, setNote] = useState("");
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setErr(null);
    setBusy(false);
    setBabyId(initialBabyId || firstBabyId);
    setKind("wet");
    setRash(false);
    setCream(false);
    setNote("");
    setMore(false);
  }, [open, initialBabyId, firstBabyId]);

  const canSave = useMemo(() => !!babyId && !busy, [babyId, busy]);

  async function handleSave() {
    if (!canSave) return;
    setBusy(true);
    setErr(null);
    try {
      await onSave({ babyId, kind, rash, cream, note: note.trim() });
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
      <div className="absolute inset-x-0 bottom-0">
        <div className="mx-auto max-w-md rounded-t-3xl bg-white p-4 shadow-2xl dark:bg-gray-950">
          <div className="flex items-center justify-between">
            <div className="text-base font-extrabold">Pelena</div>
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

          {/* kind */}
          <div className="mt-4">
            <div className="text-xs font-semibold text-gray-500">Tip</div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <Button
                variant={kind === "wet" ? "primary" : "secondary"}
                onClick={() => setKind("wet")}
              >
                Mokra
              </Button>
              <Button
                variant={kind === "poop" ? "primary" : "secondary"}
                onClick={() => setKind("poop")}
              >
                Velika
              </Button>
              <Button
                variant={kind === "mixed" ? "primary" : "secondary"}
                onClick={() => setKind("mixed")}
              >
                Obe
              </Button>
            </div>
          </div>

          {/* more */}
          <div className="mt-4">
            <button
              type="button"
              className="text-sm font-semibold text-brand-700"
              onClick={() => setMore((v) => !v)}
            >
              {more ? "Sakrij detalje" : "Više detalja"}
            </button>

            {more && (
              <Card className="mt-3 space-y-3">
                <label className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold">Osip</span>
                  <input
                    type="checkbox"
                    checked={rash}
                    onChange={(e) => setRash(e.target.checked)}
                    className="h-5 w-5"
                  />
                </label>

                <label className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold">Krema</span>
                  <input
                    type="checkbox"
                    checked={cream}
                    onChange={(e) => setCream(e.target.checked)}
                    className="h-5 w-5"
                  />
                </label>

                <div>
                  <div className="text-sm font-semibold">Napomena</div>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Opcionalno..."
                    className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none dark:border-gray-800 dark:bg-gray-950"
                    rows={3}
                  />
                </div>
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

          <div className="mt-2 text-center text-[11px] text-gray-500">
            Podsetnik: vreme unosa je „sada“. Kasnije dodajemo podešavanje vremena.
          </div>
        </div>
      </div>
    </div>
  );
}
