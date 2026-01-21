import { supabase } from "@/lib/supabase/client";
import type { ReminderOccurrence, ReminderDefinition } from "@/types/db";

export async function listUpcomingOccurrences(familyId: string): Promise<ReminderOccurrence[]> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("reminder_occurrences")
    .select("*")
    .eq("family_id", familyId)
    .gte("scheduled_for", now)
    .order("scheduled_for", { ascending: true })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as ReminderOccurrence[];
}

export async function markOccurrenceDone(id: string) {
  const { data: session } = await supabase.auth.getSession();
  const uid = session.session?.user.id;
  if (!uid) throw new Error("Not logged in");
  const { error } = await supabase.from("reminder_occurrences").update({
    status: "done",
    done_by: uid,
    done_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) throw error;
}

export async function createOneOffReminder(familyId: string, babyId: string | null, title: string, whenIso: string, category: string) {
  const { error } = await supabase.from("reminder_occurrences").insert({
    family_id: familyId,
    baby_id: babyId,
    definition_id: null,
    category,
    title,
    scheduled_for: whenIso,
    status: "scheduled"
  });
  if (error) throw error;
}

export async function createDailyVitaminDefinitionAndOccurrences(
  familyId: string,
  babyId: string | null,
  title: string,
  timeOfDay: string,
  daysAhead = 14
) {
  const { data: session } = await supabase.auth.getSession();
  const uid = session.session?.user.id;
  if (!uid) throw new Error("Not logged in");

  const anchor = new Date();
  anchor.setSeconds(0,0);

  const { data: def, error: defErr } = await supabase.from("reminder_definitions").insert({
    family_id: familyId,
    baby_id: babyId,
    category: "vitamins",
    title,
    schedule: "daily",
    start_at: anchor.toISOString(),
    time_of_day: timeOfDay,
    is_silent: true,
    requires_done: true,
    is_auto_generated: false,
    is_active: true,
    created_by: uid,
  }).select("*").single();

  if (defErr) throw defErr;

  const [hh, mm] = timeOfDay.split(":").map(Number);
  const rows = [];
  const today = new Date();
  for (let i=0;i<daysAhead;i++){
    const d = new Date(today);
    d.setDate(today.getDate()+i);
    d.setHours(hh, mm, 0, 0);
    rows.push({
      family_id: familyId,
      baby_id: babyId,
      definition_id: def.id,
      category: "vitamins",
      title,
      scheduled_for: d.toISOString(),
      status: "scheduled",
    });
  }
  const { error: occErr } = await supabase.from("reminder_occurrences").insert(rows);
  if (occErr) throw occErr;

  return def as ReminderDefinition;
}
