// lib/data/reminders.ts
"use client";

import { supabase } from "@/lib/supabase/client";
import type { ReminderOccurrence } from "@/types/db";

/**
 * Koliko unapred sync-ujemo notifikacije na uređaju.
 * Realno: 48h je dovoljno (danas + sutra), a i ne spamuje sistem.
 */
const SYNC_WINDOW_HOURS = 48;

/**
 * Učita upcoming occurrences za porodicu.
 * Default: sledećih 7 dana (da UI ima dovoljno).
 */
export async function listUpcomingOccurrences(
  familyId: string,
  daysAhead: number = 7
): Promise<ReminderOccurrence[]> {
  const now = new Date();
  const until = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from("reminder_occurrences")
    .select("*")
    .eq("family_id", familyId)
    .gte("scheduled_for", now.toISOString())
    .lte("scheduled_for", until.toISOString())
    .order("scheduled_for", { ascending: true });

  if (error) throw error;
  return (data ?? []) as ReminderOccurrence[];
}

/**
 * Mark as done za occurrence.
 */
export async function markOccurrenceDone(occurrenceId: string): Promise<void> {
  const { error } = await supabase
    .from("reminder_occurrences")
    .update({ status: "done" })
    .eq("id", occurrenceId);

  if (error) throw error;
}

/**
 * Jednokratni reminder (doktor, lek, vitamin itd.)
 */
export async function createOneOffReminder(
  familyId: string,
  babyId: string | null,
  title: string,
  whenIso: string,
  category: string
): Promise<void> {
  const payload = {
    family_id: familyId,
    baby_id: babyId,
    title: title.trim(),
    category,
    scheduled_for: whenIso,
    status: "scheduled",
  };

  const { error } = await supabase.from("reminder_occurrences").insert(payload);
  if (error) throw error;
}

/**
 * Daily vitamin helper (MVP): kreira 14 occurrences u nizu na zadato vreme.
 * Napomena: Ovo je MVP bez definicije; kasnije možemo ubaciti reminder_definitions.
 */
export async function createDailyVitaminDefinitionAndOccurrences(
  familyId: string,
  babyId: string | null,
  title: string,
  timeHHmm: string,
  countDays: number = 14,
  category: string = "vitamin"
): Promise<void> {
  const now = new Date();
  const [hh, mm] = timeHHmm.split(":").map((x) => parseInt(x, 10));
  const safeH = Number.isFinite(hh) ? hh : 18;
  const safeM = Number.isFinite(mm) ? mm : 0;

  const rows = Array.from({ length: countDays }).map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, safeH, safeM, 0, 0);
    return {
      family_id: familyId,
      baby_id: babyId,
      title: title.trim(),
      category,
      scheduled_for: d.toISOString(),
      status: "scheduled",
    };
  });

  const { error } = await supabase.from("reminder_occurrences").insert(rows);
  if (error) throw error;
}

/**
 * ✅ Global sync helper:
 * - uzme occurrences iz baze za sledećih X sati
 * - na Androidu (Capacitor) zakazuje lokalne notifikacije
 *
 * Ako nije native runtime → samo silently skip (da web ne puca).
 */
export async function syncNativeNotificationsForFamily(familyId: string): Promise<void> {
  try {
    const now = new Date();
    const until = new Date(now.getTime() + SYNC_WINDOW_HOURS * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from("reminder_occurrences")
      .select("id, title, category, scheduled_for, status")
      .eq("family_id", familyId)
      .gte("scheduled_for", now.toISOString())
      .lte("scheduled_for", until.toISOString())
      .order("scheduled_for", { ascending: true });

    if (error) throw error;

    const upcoming = (data ?? [])
      .filter((x: any) => x.status !== "done")
      .map((x: any) => ({
        id: x.id as string,
        title: x.title as string,
        category: x.category as string,
        scheduled_for: x.scheduled_for as string,
      }));

    // Dynamic import da web build ne poludi ako nema Capacitor-a
    const mod = await import("@/lib/native/remindersSync").catch(() => null);
    if (!mod?.syncRemindersToLocalNotifications) return;

    await mod.syncRemindersToLocalNotifications(upcoming);
  } catch {
    // silent fail by design
  }
}

/**
 * Helper koji koristi feeding flow:
 * napravi reminder occurrence za sledeće hranjenje (+2h45m).
 */
export async function createNextFeedingReminder(
  familyId: string,
  babyId: string,
  minutesFromNow: number = 165 // 2h45m
): Promise<void> {
  const when = new Date(Date.now() + minutesFromNow * 60 * 1000).toISOString();
  const title = "Sledeće hranjenje";
  const category = "feeding";

  const { error } = await supabase.from("reminder_occurrences").insert({
    family_id: familyId,
    baby_id: babyId,
    title,
    category,
    scheduled_for: when,
    status: "scheduled",
  });

  if (error) throw error;
}
