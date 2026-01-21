import { supabase } from "@/lib/supabase/client";
import type { EventRow } from "@/types/db";

/**
 * Poslednji eventi (timeline / dashboard)
 */
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
 */
export async function createFeeding(
  familyId: string,
  babyId: string,
  mode: "formula" | "breast" | "solid",
  amountMl?: number
) {
  const { error } = await supabase.from("events").insert({
    family_id: familyId,
    baby_id: babyId,
    type: "feeding",
    feeding_mode: mode,
    amount_ml: amountMl ?? null,
  });

  if (error) throw error;
}

/**
 * DIAPER
 * kind: wet | poop | mixed
 * extra: rash / cream / note
 */
export async function createDiaper(
  familyId: string,
  babyId: string,
  kind: "wet" | "poop" | "mixed",
  extra?: {
    rash?: boolean;
    cream?: boolean;
    note?: string;
  }
) {
  const { error } = await supabase.from("events").insert({
    family_id: familyId,
    baby_id: babyId,
    type: "diaper",
    diaper_kind: kind,
    data: {
      rash: !!extra?.rash,
      cream: !!extra?.cream,
    },
    note: extra?.note?.trim() || null,
  });

  if (error) throw error;
}

/**
 * SLEEP (za kasnije)
 */
export async function createSleepStart(
  familyId: string,
  babyId: string
) {
  const { error } = await supabase.from("events").insert({
    family_id: familyId,
    baby_id: babyId,
    type: "sleep_start",
  });

  if (error) throw error;
}

export async function createSleepEnd(
  familyId: string,
  babyId: string
) {
  const { error } = await supabase.from("events").insert({
    family_id: familyId,
    baby_id: babyId,
    type: "sleep_end",
  });

  if (error) throw error;
}
