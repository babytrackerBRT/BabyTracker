import { supabase } from "@/lib/supabase/client";
import type { ReminderOccurrence } from "@/types/db";
import { syncRemindersToLocalNotifications } from "@/lib/native/remindersSync";

type ReminderCategory =
  | "doctor"
  | "vitamin"
  | "feeding"
  | "feeding_prep"
  | "general";

type OccurrenceStatus = "scheduled" | "done" | "cancelled";

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const uid = data.user?.id;
  if (!uid) throw new Error("Niste prijavljeni.");
  return uid;
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

export async function listUpcomingOccurrences(
  familyId: string
): Promise<ReminderOccurrence[]> {
  const { data, error } = await supabase
    .from("reminder_occurrences")
    .select("*")
    .eq("family_id", familyId)
    .order("scheduled_for", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function markOccurrenceDone(id: string) {
  const uid = await requireUserId();

  const { error } = await supabase
    .from("reminder_occurrences")
    .update({ status: "done", done_at: new Date().toISOString(), done_by: uid })
    .eq("id", id);

  if (error) throw error;
}

/**
 * Jednokratni reminder (npr. doktor)
 */
export async function createOneOffReminder(
  familyId: string,
  babyId: string | null,
  title: string,
  whenIso: string,
  category: ReminderCategory = "general"
) {
  const uid = await requireUserId();

  const { error } = await supabase.from("reminder_occurrences").insert({
    family_id: familyId,
    baby_id: babyId,
    title: title.trim(),
    category,
    scheduled_for: whenIso,
    status: "scheduled" as OccurrenceStatus,
    created_by: uid,
    data: {},
  });

  if (error) throw error;
}

/**
 * Daily vitamin: napravi definiciju + occurrences za narednih N dana.
 * (pošto si ti ovo već koristio u /podsetnici page)
 */
export async function createDailyVitaminDefinitionAndOccurrences(
  familyId: string,
  babyId: string | null,
  title: string,
  timeHHmm: string,
  days = 14
) {
  const uid = await requireUserId();

  const [hh, mm] = timeHHmm.split(":").map((x) => parseInt(x, 10));
  const now = new Date();

  // definicija (optional)
  const { data: def, error: defErr } = await supabase
    .from("reminder_definitions")
    .insert({
      family_id: familyId,
      baby_id: babyId,
      title: title.trim(),
      category: "vitamin",
      created_by: uid,
      data: { time: timeHHmm },
    })
    .select("*")
    .single();

  if (defErr) throw defErr;

  const occurrences = Array.from({ length: days }).map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, hh || 0, mm || 0, 0);
    return {
      family_id: familyId,
      baby_id: babyId,
      definition_id: def?.id ?? null,
      title: title.trim(),
      category: "vitamin",
      scheduled_for: d.toISOString(),
      status: "scheduled" as OccurrenceStatus,
      created_by: uid,
      data: { kind: "vitamin_daily" },
    };
  });

  const { error } = await supabase.from("reminder_occurrences").insert(occurrences);
  if (error) throw error;
}

/**
 * ✅ Core: posle hranjenja kreiramo:
 * - feeding_prep: interval-15min
 * - feeding: interval
 *
 * Interval uzimamo iz babies:
 * - use_recommended_interval = true -> preporuka po uzrastu
 * - false -> feeding_interval_minutes (custom)
 */
export async function createFeedingPrepAndDueReminders(
  familyId: string,
  babyId: string,
  occurredAtIso: string
) {
  const uid = await requireUserId();

  // fetch baby config
  const { data: baby, error: babyErr } = await supabase
    .from("babies")
    .select("id,birth_date,use_recommended_interval,feeding_interval_minutes")
    .eq("id", babyId)
    .single();

  if (babyErr) throw babyErr;

  const useRec = baby?.use_recommended_interval !== false;
  const custom = typeof baby?.feeding_interval_minutes === "number" ? baby.feeding_interval_minutes : null;

  const intervalMin = useRec ? recommendedIntervalMinutes(baby?.birth_date ?? null) : (custom ?? 165);
  const prepMin = Math.max(0, intervalMin - 15);

  // clear future scheduled feeding reminders for this baby
  const nowIso = new Date().toISOString();
  await supabase
    .from("reminder_occurrences")
    .delete()
    .eq("family_id", familyId)
    .eq("baby_id", babyId)
    .in("category", ["feeding", "feeding_prep"])
    .eq("status", "scheduled")
    .gte("scheduled_for", nowIso);

  const base = new Date(occurredAtIso).getTime();
  const prepAt = new Date(base + prepMin * 60 * 1000).toISOString();
  const dueAt = new Date(base + intervalMin * 60 * 1000).toISOString();

  const learnMoreUrl =
    useRec
      ? "https://www.healthychildren.org/English/ages-stages/baby/feeding-nutrition/Pages/how-often-and-how-much-should-your-baby-eat.aspx"
      : null;

  const { error } = await supabase.from("reminder_occurrences").insert([
    {
      family_id: familyId,
      baby_id: babyId,
      title: "Pripremi obrok",
      category: "feeding_prep",
      scheduled_for: prepAt,
      status: "scheduled" as OccurrenceStatus,
      created_by: uid,
      data: {
        kind: "feeding_prep",
        interval_minutes: intervalMin,
        prep_minutes: prepMin,
        source: useRec ? "recommended" : "custom",
        learn_more_url: learnMoreUrl,
      },
    },
    {
      family_id: familyId,
      baby_id: babyId,
      title: "Sledeće hranjenje",
      category: "feeding",
      scheduled_for: dueAt,
      status: "scheduled" as OccurrenceStatus,
      created_by: uid,
      data: {
        kind: "feeding_due",
        interval_minutes: intervalMin,
        source: useRec ? "recommended" : "custom",
        learn_more_url: learnMoreUrl,
      },
    },
  ]);

  if (error) throw error;
}

/**
 * ✅ Native sync: uzmi occurrences za narednih 24h i zakaži notifikacije.
 * (web = no-op)
 */
export async function syncNativeNotificationsForFamily(familyId: string) {
  const now = new Date();
  const end = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from("reminder_occurrences")
    .select("id,title,category,scheduled_for,status")
    .eq("family_id", familyId)
    .eq("status", "scheduled")
    .gte("scheduled_for", now.toISOString())
    .lte("scheduled_for", end.toISOString())
    .order("scheduled_for", { ascending: true });

  if (error) throw error;

  const reminders = (data ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    category: r.category,
    scheduled_for: r.scheduled_for,
  }));

  await syncRemindersToLocalNotifications(reminders);
}
