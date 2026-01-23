"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Chip } from "@/components/ui/Chip";
import {
  getMyFamilyId,
  listBabies,
  updateBabyName,
  addBaby,
  listInvites,
  createInvite,
  listFamilyMembers,
} from "@/lib/data/family";
import type { Baby, FamilyInvite, FamilyMember } from "@/types/db";
import { formatDate, randomToken } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";
import { testVibrateNotification } from "@/lib/native/testNotification";

type ThemePref = "light" | "dark";
type IntervalMode = "recommended" | "custom";

function applyTheme(theme: ThemePref) {
  const root = document.documentElement;
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}

function daysBetween(aIso?: string | null, b = new Date()) {
  if (!aIso) return null;
  const a = new Date(aIso);
  if (Number.isNaN(a.getTime())) return null;
  const diff = b.getTime() - a.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Informativna preporuka (heads-up), roditelj bira.
 */
function recommendedIntervalMinutes(birthDateIso?: string | null): number {
  const days = daysBetween(birthDateIso);
  if (days == null) return 165; // fallback
  if (days <= 30) return 150;
  if (days <= 90) return 180;
  if (days <= 180) return 210;
  return 240;
}

function recommendationLabel(birthDateIso?: string | null) {
  const days = daysBetween(birthDateIso);
  if (days == null) return "Preporuka (opšti default)";
  if (days <= 30) return "0–1 mesec";
  if (days <= 90) return "1–3 meseca";
  if (days <= 180) return "3–6 meseci";
  return "6+ meseci";
}

const FEEDING_SOURCES = [
  {
    label: "AAP (HealthyChildren) – koliko često beba jede",
    url: "https://www.healthychildren.org/English/ages-stages/baby/feeding-nutrition/Pages/how-often-and-how-much-should-your-baby-eat.aspx",
  },
  {
    label: "Mayo Clinic – newborn feeding tips",
    url: "https://www.mayoclinic.org/healthy-lifestyle/infant-and-toddler-health/in-depth/healthy-baby/art-20047741",
  },
  {
    label: "NHS – feeding your newborn baby",
    url: "https://www.nhs.uk/best-start-in-life/baby/baby-basics/caring-for-your-baby/feeding-your-newborn-baby/",
  },
];

export default function SettingsPage() {
  const [familyId, setFamilyId] = useState("");
  const [babies, setBabies] = useState<Baby[]>([]);
  const [selected, setSelected] = useState<string>("");

  const [name, setName] = useState("");
  const [birth, setBirth] = useState<string>("");

  // interval settings
  const [intervalMode, setIntervalMode] = useState<IntervalMode>("recommended");
  const [customMinutes, setCustomMinutes] = useState<number>(165);

  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [invites, setInvites] = useState<FamilyInvite[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");

  const [theme, setTheme] = useState<ThemePref>("light");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const selectedBaby = useMemo(
    () => babies.find((b) => b.id === selected) ?? null,
    [babies, selected]
  );

  async function load() {
    try {
      setErr(null);
      const fid = await getMyFamilyId();
      setFamilyId(fid);

      const b = await listBabies(fid);
      setBabies(b);

      const sel = selected || b[0]?.id || "";
      setSelected(sel);

      const sb = b.find((x) => x.id === sel);
      setName(sb?.name ?? "");
      setBirth(sb?.birth_date ?? "");

      // učitaj interval iz baze
      const useRec = (sb as any)?.use_recommended_interval;
      const custom = (sb as any)?.feeding_interval_minutes;

      setIntervalMode(useRec === false ? "custom" : "recommended");
      setCustomMinutes(
        typeof custom === "number" && Number.isFinite(custom) ? custom : 165
      );

      const mem = await listFamilyMembers(fid);
      setMembers(mem);

      const inv = await listInvites(fid);
      setInvites(inv);
    } catch (e: any) {
      setErr(e?.message ?? "Greška");
    }
  }

  useEffect(() => {
    try {
      const saved = (localStorage.getItem("pogo_theme") as ThemePref) || "light";
      setTheme(saved);
      applyTheme(saved);
    } catch {}
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveBaby() {
    if (!selectedBaby) return;
    setBusy(true);
    setErr(null);

    try {
      // ime (tvoj existing flow)
      await updateBabyName(selectedBaby.id, name.trim() || "Beba");

      // interval payload
      const useRecommended = intervalMode === "recommended";
      const intervalToSave = useRecommended ? null : customMinutes;

      const { error } = await supabase
        .from("babies")
        .update({
          birth_date: birth || null,
          use_recommended_interval: useRecommended,
          feeding_interval_minutes: intervalToSave,
        })
        .eq("id", selectedBaby.id);

      if (error) throw error;

      await load();
    } catch (e: any) {
      setErr(e?.message ?? "Greška pri čuvanju.");
    } finally {
      setBusy(false);
    }
  }

  async function addSecondBaby() {
    if (!familyId) return;
    await addBaby(familyId, "Beba 2");
    await load();
  }

  async function sendInvite() {
    if (!familyId) return;
    if (!inviteEmail.includes("@")) return setErr("Unesite ispravan email.");

    const token = randomToken(48);
    await createInvite(familyId, inviteEmail, token);
    await load();
    setInviteEmail("");

    alert(
      `Pozivnica kreirana. Link (pošalji ručno): ${window.location.origin}/pozivnica?token=${token}`
    );
  }

  async function testNotif() {
    await testVibrateNotification();
    alert("Zakazano za 10 sekundi ✅");
  }

  function toggleTheme() {
    const next: ThemePref = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try {
      localStorage.setItem("pogo_theme", next);
    } catch {}
    applyTheme(next);
  }

  async function logout() {
    const ok = confirm("Da li želite da se odjavite?");
    if (!ok) return;
    await supabase.auth.signOut();
  }

  const recommendedMin = recommendedIntervalMinutes(birth || null);

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-semibold text-gray-500">Pogo Baby Log</div>
        <h1 className="text-2xl font-extrabold">Podešavanja</h1>
      </div>

      {err && <Card className="border-red-200 bg-red-50 text-red-700">{err}</Card>}

      <Card className="space-y-3">
        <div className="text-sm font-extrabold">Izgled</div>
        <div className="text-sm text-gray-600">
          Za sada držimo Light kao default dok ne sredimo dark mode.
        </div>
        <Button variant="secondary" onClick={toggleTheme} className="w-full">
          Dark mode: {theme === "dark" ? "Uključen" : "Isključen"}
        </Button>
      </Card>

      <Card className="space-y-3">
        <div className="text-sm font-extrabold">Porodica i bebe</div>

        <div className="flex flex-wrap gap-2">
          {babies.map((b) => (
            <Chip
              key={b.id}
              active={b.id === selected}
              onClick={() => {
                setSelected(b.id);
                setName(b.name);
                setBirth(b.birth_date ?? "");

                const useRec = (b as any)?.use_recommended_interval;
                const custom = (b as any)?.feeding_interval_minutes;

                setIntervalMode(useRec === false ? "custom" : "recommended");
                setCustomMinutes(
                  typeof custom === "number" && Number.isFinite(custom) ? custom : 165
                );
              }}
            >
              {b.name}
            </Chip>
          ))}

          {babies.length < 2 && (
            <button
              onClick={addSecondBaby}
              className="rounded-full border border-dashed border-gray-300 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200"
              type="button"
            >
              + Dodaj bebu
            </button>
          )}
        </div>

        {selectedBaby && (
          <div className="rounded-2xl border border-gray-200 p-3 dark:border-gray-800 space-y-3">
            <div className="text-xs font-semibold text-gray-500">Podešavanja bebe</div>

            <div>
              <label className="text-sm font-semibold">Ime</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div>
              <label className="text-sm font-semibold">Datum rođenja</label>
              <Input value={birth} onChange={(e) => setBirth(e.target.value)} type="date" />
              <div className="mt-1 text-xs text-gray-500">
                Koristi se samo za “heads-up” preporuku intervala hranjenja.
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 p-3 dark:border-gray-800 space-y-2">
              <div className="text-sm font-extrabold">Interval hranjenja</div>
              <div className="text-xs text-gray-500">
                Informativno + tvoj izbor. Ako pedijatar kaže drugačije – prati pedijatra.
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  variant={intervalMode === "recommended" ? "primary" : "secondary"}
                  onClick={() => setIntervalMode("recommended")}
                >
                  Preporučeno
                </Button>
                <Button
                  className="flex-1"
                  variant={intervalMode === "custom" ? "primary" : "secondary"}
                  onClick={() => setIntervalMode("custom")}
                >
                  Custom
                </Button>
              </div>

              {intervalMode === "recommended" ? (
                <Card>
                  <div className="text-sm font-semibold">
                    {recommendationLabel(birth || null)} • ~{Math.round(recommendedMin / 60)}h
                  </div>
                  <div className="text-xs text-gray-500">
                    Default: {recommendedMin} min
                  </div>

                  <div className="mt-2 space-y-1">
                    {FEEDING_SOURCES.map((s) => (
                      <a
                        key={s.url}
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block text-sm font-semibold text-brand-700"
                      >
                        Prikaži više
                      </a>
                    ))}
                  </div>
                </Card>
              ) : (
                <Card className="space-y-2">
                  <div className="text-xs font-semibold text-gray-500">Custom interval (min)</div>
                  <div className="flex flex-wrap gap-2">
                    {[120, 150, 165, 180, 210, 240, 270, 300].map((m) => (
                      <Chip
                        key={m}
                        active={customMinutes === m}
                        onClick={() => setCustomMinutes(m)}
                      >
                        {m} min
                      </Chip>
                    ))}
                  </div>
                  <div className="text-xs text-gray-500">
                    “Pripremi obrok” = {Math.max(0, customMinutes - 15)} min •
                    “Sledeće hranjenje” = {customMinutes} min
                  </div>
                </Card>
              )}
            </div>

            <Button onClick={saveBaby} className="w-full" disabled={busy}>
              {busy ? "Čuvam…" : "Sačuvaj"}
            </Button>
          </div>
        )}
      </Card>

      <Card className="space-y-3">
        <div className="text-sm font-extrabold">Roditelji</div>
        <div className="space-y-2">
          {members.map((m) => (
            <div
              key={m.user_id}
              className="flex items-center justify-between rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-800"
            >
              <div className="font-semibold">
                {m.role === "admin" ? "Roditelj 1 (Admin)" : "Roditelj"}
              </div>
              <div className="text-xs text-gray-500">{m.role}</div>
            </div>
          ))}

          <div className="rounded-2xl border border-gray-200 p-3 dark:border-gray-800">
            <div className="text-sm font-semibold">Dodaj roditelja</div>
            <div className="mt-2 space-y-2">
              <Input
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="email@primer.com"
                type="email"
              />
              <Button onClick={sendInvite} className="w-full">
                Pošalji pozivnicu
              </Button>
              <div className="text-xs text-gray-500">
                Za MVP, link se prikazuje kao alert. Kasnije ubacujemo slanje emaila.
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="space-y-2">
        <div className="text-sm font-extrabold">Pozivnice</div>
        {invites.length ? (
          invites.map((i) => (
            <div
              key={i.id}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-800"
            >
              <div className="flex items-center justify-between">
                <div className="font-semibold">{i.invited_email}</div>
                <div className="text-xs text-gray-500">{i.status}</div>
              </div>
              <div className="text-xs text-gray-500">Važi do: {formatDate(i.expires_at)}</div>
            </div>
          ))
        ) : (
          <div className="text-sm text-gray-500">Nema pozivnica.</div>
        )}
      </Card>

    </div>
  );
}
