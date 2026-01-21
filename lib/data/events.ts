import { supabase } from "@/lib/supabase/client";
import type { EventRow } from "@/types/db";

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

export async function createFeeding(
  familyId: string,
  babyId: string,
  mode: "formula" | "breast" | "solid",
  amountMl?: number
) {
  const userId = await requireUserId();

  const { error } = await supabase.from("events").insert({
    family_id: familyId,
    baby_id: babyId,
    created_by: userId, // ✅ bitno za RLS
    type: "feeding",
    feeding_mode: mode,
    amount_ml: amountMl ?? null,
  });

  if (error) throw error;
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
    created_by: userId, // ✅ bitno za RLS
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
