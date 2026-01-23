import { supabase } from "@/lib/supabase/client";
import type { EventRow } from "@/types/db";
import { createFeedingPrepAndDueReminders, syncNativeNotificationsForFamily } from "@/lib/data/reminders";

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

export async function deleteEvent(eventId: string) {
  const { error } = await supabase.from("events").delete().eq("id", eventId);
  if (error) throw error;
}

export async function updateEvent(eventId: string, payload: Partial<EventRow>) {
  const { error } = await supabase.from("events").update(payload).eq("id", eventId);
  if (error) throw error;
}

/**
 * FEEDING:
 * - upis eventa
 * - automatski: feeding_prep + feeding reminders prema podešavanju bebe
 * - sync local notifications (Android)
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

  // ✅ Create prep+due reminders based on baby settings
  await createFeedingPrepAndDueReminders(familyId, babyId, occurredAt);

  // ✅ Native sync (next 24h)
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
