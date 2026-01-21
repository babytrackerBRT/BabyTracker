import { supabase } from "@/lib/supabase/client";

type FeedingCategory = "feeding_prep" | "feeding_due";

function addMinutes(iso: string, minutes: number) {
  const d = new Date(iso);
  return new Date(d.getTime() + minutes * 60_000).toISOString();
}

export async function cancelFutureFeedingOccurrences(params: {
  familyId: string;
  babyId: string;
}) {
  const { familyId, babyId } = params;

  const { error } = await supabase
    .from("reminder_occurrences")
    .update({ status: "canceled" })
    .eq("family_id", familyId)
    .eq("baby_id", babyId)
    .in("category", ["feeding_prep", "feeding_due"])
    .eq("status", "scheduled")
    .gte("scheduled_for", new Date().toISOString());

  if (error) throw error;
}

export async function createFeedingOccurrences(params: {
  familyId: string;
  babyId: string;
  occurredAt: string; // ISO
  intervalMinutes: number; // npr 180, 210, 240...
}) {
  const { familyId, babyId, occurredAt, intervalMinutes } = params;

  const prepAt = addMinutes(occurredAt, intervalMinutes - 15);
  const dueAt = addMinutes(occurredAt, intervalMinutes);

  const rows = [
    {
      family_id: familyId,
      baby_id: babyId,
      category: "feeding_prep" as FeedingCategory,
      title: "Pripremi obrok",
      scheduled_for: prepAt,
      status: "scheduled",
    },
    {
      family_id: familyId,
      baby_id: babyId,
      category: "feeding_due" as FeedingCategory,
      title: "Vreme za hranjenje",
      scheduled_for: dueAt,
      status: "scheduled",
    },
  ];

  const { error } = await supabase.from("reminder_occurrences").insert(rows);
  if (error) throw error;

  return { prepAt, dueAt };
}

/**
 * One-stop helper: nakon hranjenja, otkaži stare i napravi nova 2 reminders.
 */
export async function scheduleFeedingReminders(params: {
  familyId: string;
  babyId: string;
  occurredAt: string; // ISO
  intervalMinutes: number;
}) {
  await cancelFutureFeedingOccurrences({ familyId: params.familyId, babyId: params.babyId });
  return createFeedingOccurrences(params);
}
