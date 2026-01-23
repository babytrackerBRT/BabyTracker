import { supabase } from "@/lib/supabase/client";
import type { EventRow } from "@/types/db";

import {
  createNextFeedingReminder,
  syncNativeNotificationsForFamily,
} from "@/lib/data/reminders";

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const uid = data.user?.id;
  if (!uid) throw new Error("Niste prijavljeni. Molimo prijavite se ponovo.");
  return uid;
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

/**
 * FEEDING
 * - upis eventa
 * - automatski kreira reminder occurrence za sledeće hranjenje (+2h45m)
 * - radi native sync notifikacija (Android Capacitor) za SVE reminders
 */
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

  // ✅ 1) Kreiraj reminder za sledeće hranjenje (+2h45m)
  // (koristi occurrence tabelu kao source of truth)
  await createNextFeedingReminder(familyId, babyId, 165);

  // ✅ 2) Sync notifikacija za celu porodicu (za sve reminders)
  await syncNativeNotificationsForFamily(familyId);
}

/**
 * DIAPER
 */
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
}
