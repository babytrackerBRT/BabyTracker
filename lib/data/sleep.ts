import { supabase } from "@/lib/supabase/client";

export type SleepSessionRow = {
  id: string;
  family_id: string;
  baby_id: string;
  started_at: string;
  ended_at: string | null;
  quality: "good" | "normal" | "restless" | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
};

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const uid = data.user?.id;
  if (!uid) throw new Error("Niste prijavljeni.");
  return uid;
}

export async function getActiveSleepSession(babyId: string): Promise<{ id: string; started_at: string } | null> {
  const { data, error } = await supabase
    .from("sleep_sessions")
    .select("id,started_at")
    .eq("baby_id", babyId)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1);

  if (error) throw error;
  const row = (data ?? [])[0];
  return row ? { id: row.id, started_at: row.started_at } : null;
}

export async function startSleepSession(familyId: string, babyId: string) {
  const userId = await requireUserId();

  // ako već postoji aktivna sesija, ne kreiramo novu
  const active = await getActiveSleepSession(babyId);
  if (active) return;

  const { error } = await supabase.from("sleep_sessions").insert({
    family_id: familyId,
    baby_id: babyId,
    started_at: new Date().toISOString(),
    created_by: userId,
  });

  if (error) throw error;
}

export async function stopSleepSession(
  sessionId: string,
  payload: { quality?: "good" | "normal" | "restless"; note?: string }
) {
  const userId = await requireUserId();

  const { error } = await supabase
    .from("sleep_sessions")
    .update({
      ended_at: new Date().toISOString(),
      quality: payload.quality ?? null,
      note: payload.note ?? null,
      // optional audit:
      // updated_by: userId,
    })
    .eq("id", sessionId);

  if (error) throw error;

  // (ako želiš audit da znaš ko je završio — možemo dodati kolonu)
  void userId;
}

export async function listRecentSleepSessions(
  familyId: string,
  limit = 200
): Promise<SleepSessionRow[]> {
  const { data, error } = await supabase
    .from("sleep_sessions")
    .select("*")
    .eq("family_id", familyId)
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as SleepSessionRow[];
}
