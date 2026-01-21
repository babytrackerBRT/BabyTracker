export type MemberRole = "admin" | "parent";
export type EventType = "feeding" | "diaper" | "health";
export type FeedingMode = "formula" | "breast" | "solid";
export type DiaperKind = "wet" | "poop" | "mixed";
export type ReminderCategory = "doctor" | "meds" | "vitamins" | "care" | "custom" | "feeding_prep" | "feeding_due";
export type ReminderStatus = "scheduled" | "done" | "skipped" | "canceled";
export type ScheduleType = "once" | "daily" | "weekly" | "custom";

export type Family = { id: string; name: string; created_by: string; created_at: string; };
export type FamilyMember = { family_id: string; user_id: string; role: MemberRole; created_at: string; };
export type Baby = {
  id: string; family_id: string; name: string; birth_date: string | null;
  use_recommended_interval: boolean; feeding_interval_minutes: number | null; last_recommended_bucket: string | null;
  created_at: string; updated_at: string;
};
export type EventRow = {
  id: string; family_id: string; baby_id: string; created_by: string; type: EventType; occurred_at: string;
  feeding_mode: FeedingMode | null; amount_ml: number | null; diaper_kind: DiaperKind | null;
  data: any; note: string | null; created_at: string; updated_at: string;
};
export type SleepSession = {
  id: string; family_id: string; baby_id: string; created_by: string; started_at: string; ended_at: string | null;
  quality: "good" | "normal" | "restless" | null; note: string | null; created_at: string; updated_at: string;
};
export type ReminderOccurrence = {
  id: string; family_id: string; baby_id: string | null; definition_id: string | null;
  category: ReminderCategory; title: string; scheduled_for: string; status: ReminderStatus;
  done_by: string | null; done_at: string | null; source_event_id: string | null; created_at: string;
};
export type ReminderDefinition = {
  id: string; family_id: string; baby_id: string | null; category: ReminderCategory; title: string;
  schedule: ScheduleType; start_at: string; end_at: string | null; time_of_day: string | null; days_of_week: number[] | null;
  is_silent: boolean; requires_done: boolean; is_auto_generated: boolean; is_active: boolean;
  notes: string | null; location: string | null; created_by: string; created_at: string; updated_at: string;
};
export type FamilyInvite = {
  id: string; family_id: string; invited_email: string; role: MemberRole; token: string;
  status: "pending" | "accepted" | "revoked" | "expired"; invited_by: string; created_at: string; expires_at: string;
  accepted_by: string | null; accepted_at: string | null;
};
