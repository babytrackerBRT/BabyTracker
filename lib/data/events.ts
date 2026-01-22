import { supabase } from "@/lib/supabase/client";
import type { EventRow } from "@/types/db";
import { scheduleFeedingReminders } from "@/lib/data/feedingReminders";
import { syncNativeNotificationsForFamily } from "@/lib/native/notifications";

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const uid = data.user?.id;
  if (!uid) throw new Error("Niste prijavljeni. Molimo prijavite se ponovo.");
  return uid;
}

function calcRecommendedIntervalMinutes(birthDate: string | null): number {
  if (!birthDate) return 180;
  const dob = new Date(birthDate);
  const now = new Date();
  const diffMs = now.getTime() - dob.getTime();
  const months = diffMs / (1000 * 60 * 60 * 24 * 30.44);

  if (months < 2) return 180;
  if (months < 4) return 210;
  if (months < 6) return 240;
  if (months < 9) return 270;
  return 300;
}

async function getFeedingIntervalMinutesForBaby(babyId: string): Promise<number> {
  const { data, error } = await supabase
    .from("babies")
    .select("birth_date,use_recommended_interval,feeding_interval_minutes")
    .eq("id", babyId)
    .single();

  if (error) throw error;

  if (data.use_recommended_interval) {
    return calcRecommendedIntervalMinutes(data.birth_date ?? null);
  }

  const custom = Number(data.feeding_interval_minutes);
  if (Number.isFinite(custom) && custom > 0) return custom;

  return 180;
}

export async function listRecentEvents(familyId: string, limit = 20): Promise<EventRow[]> {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("family_id", familyId)
    .order("occurred_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function createFeeding(
  familyId: string,
  babyId: string,
  mode: "formula" | "breast" | "solid",
  amountMl?: number,
  opts?: {
    occurredAt?: string; // ISO
    note?: string;
    data?: Record<string, any>;
  }
) {
  const userId = await requireUserId();
  const occurredAt = opts?.occurredAt ?? new Date().toISOString();

  const { error } = await supabase.from("events").insert({
    family_id: familyId,
    baby_id: babyId,
    created_by: userId,
    type: "feeding",
    occurred_at: occurredAt,
    feeding_mode: mode,
    amount_ml: amountMl ?? null,
    data: opts?.data ?? {},
    note: opts?.note?.trim() || null,
  });

  if (error) throw error;

  // ✅ AUTO reminders posle hranjenja
  const intervalMinutes = await getFeedingIntervalMinutesForBaby(babyId);
  await scheduleFeedingReminders({
    familyId,
    babyId,
    occurredAt,
    intervalMinutes,
  });

  // ✅ ODMAH sync native notifikacija (za sve reminders)
  await syncNativeNotificationsForFamily(familyId);
}

export async function createDiaper(
  familyId: string,
  babyId: string,
  kind: "wet" | "poop" | "mixed",
  extra?: { rash?: boolean; cream?: boolean; note?: string }
) {
  const userId = await requireUserId();

  const { error } = await supabase.from("events").insert({
    family_id: familyId,
    baby_id: babyId,
    created_by: userId,
    type: "diaper",
    occurred_at: new Date().toISOString(),
    diaper_kind: kind,
    data: {
      rash: !!extra?.rash,
      cream: !!extra?.cream,
    },
    note: extra?.note?.trim() || null,
  });

  if (error) throw error;

  // (Pelene trenutno ne generišu reminders, ali sync neće škoditi – no-op na webu)
}
