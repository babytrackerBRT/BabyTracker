import { supabase } from "@/lib/supabase/client";
import type { EventRow } from "@/types/db";

export async function listRecentEvents(familyId: string, limit = 20): Promise<EventRow[]> {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("family_id", familyId)
    .order("occurred_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as EventRow[];
}

export async function createFeeding(familyId: string, babyId: string, mode: "formula"|"breast"|"solid", amountMl?: number, note?: string) {
  const { data: session } = await supabase.auth.getSession();
  const uid = session.session?.user.id;
  if (!uid) throw new Error("Not logged in");
  const { data, error } = await supabase.from("events").insert({
    family_id: familyId,
    baby_id: babyId,
    created_by: uid,
    type: "feeding",
    feeding_mode: mode,
    amount_ml: amountMl ?? null,
    data: {},
    note: note ?? null
  }).select("*").single();
  if (error) throw error;
  return data as EventRow;
}

export async function createDiaper(familyId: string, babyId: string, kind: "wet"|"poop"|"mixed", note?: string) {
  const { data: session } = await supabase.auth.getSession();
  const uid = session.session?.user.id;
  if (!uid) throw new Error("Not logged in");
  const { data, error } = await supabase.from("events").insert({
    family_id: familyId,
    baby_id: babyId,
    created_by: uid,
    type: "diaper",
    diaper_kind: kind,
    data: {},
    note: note ?? null
  }).select("*").single();
  if (error) throw error;
  return data as EventRow;
}
