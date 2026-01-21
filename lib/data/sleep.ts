import { supabase } from "@/lib/supabase/client";

type SleepQuality = "good" | "normal" | "restless";

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const uid = data.user?.id;
  if (!uid) throw new Error("Niste prijavljeni. Molimo prijavite se ponovo.");
  return uid;
}

export async function getActiveSleepSession(babyId: string): Promise<{ id: string; started_at: string } | null> {
  const { data, error } = await supabase
    .from("sleep_sessions")
    .select("id, started_at")
    .eq("baby_id", babyId)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ? { id: data.id, started_at: data.started_at } : null;
}

export async function startSleepSession(familyId: string, babyId: string): Promise<void> {
  const userId = await requireUserId();

  // safety: ako već postoji aktivna, nemoj duplirati
  const active = await getActiveSleepSession(babyId);
  if (active) return;

  const { error } = await supabase.from("sleep_sessions").insert({
    family_id: familyId,
    baby_id: babyId,
    created_by: userId,
    started_at: new Date().toISOString(),
  });

  if (error) throw error;
}

export async function stopSleepSession(
  sessionId: string,
  payload?: { quality?: SleepQuality; note?: string }
): Promise<void> {
  const update: any = {
    ended_at: new Date().toISOString(),
  };

  if (payload?.quality) update.quality = payload.quality;
  if (payload?.note) update.note = payload.note.trim();

  const { error } = await supabase.from("sleep_sessions").update(update).eq("id", sessionId);
  if (error) throw error;
}
