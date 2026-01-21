import { supabase } from "@/lib/supabase/client";
import type { Baby, FamilyInvite, FamilyMember } from "@/types/db";

/**
 * Vraća userId trenutnog ulogovanog user-a.
 */
async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const uid = data.user?.id;
  if (!uid) throw new Error("Niste prijavljeni. Molimo prijavite se ponovo.");
  return uid;
}

/**
 * Nađe family_id za trenutnog user-a (iz family_members).
 * Ovo je glavni izvor istine. (Trigger ti već kreira family + member na signup.)
 */
export async function getMyFamilyId(): Promise<string> {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from("family_members")
    .select("family_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;

  if (!data?.family_id) {
    // Ako user nije nastao posle trigger-a, ili je nešto puklo u DB.
    throw new Error(
      "Nije pronađena porodica za ovaj nalog. Probajte odjavu/prijavu ili napravite novi nalog za test."
    );
  }

  return data.family_id;
}

/**
 * Baby CRUD
 */
export async function listBabies(familyId: string): Promise<Baby[]> {
  const { data, error } = await supabase
    .from("babies")
    .select("*")
    .eq("family_id", familyId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Baby[];
}

export async function addBaby(familyId: string, name: string): Promise<Baby> {
  const { data, error } = await supabase
    .from("babies")
    .insert({ family_id: familyId, name: name.trim() || "Beba" })
    .select("*")
    .single();

  if (error) throw error;
  return data as Baby;
}

export async function updateBabyName(babyId: string, name: string): Promise<void> {
  const { error } = await supabase
    .from("babies")
    .update({ name: name.trim() || "Beba" })
    .eq("id", babyId);

  if (error) throw error;
}

/**
 * Family members
 */
export async function listFamilyMembers(familyId: string): Promise<FamilyMember[]> {
  const { data, error } = await supabase
    .from("family_members")
    .select("family_id,user_id,role,created_at")
    .eq("family_id", familyId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as FamilyMember[];
}

/**
 * Invites
 */
export async function listInvites(familyId: string): Promise<FamilyInvite[]> {
  const { data, error } = await supabase
    .from("family_invites")
    .select("*")
    .eq("family_id", familyId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as FamilyInvite[];
}

export async function createInvite(
  familyId: string,
  invitedEmail: string,
  token: string
): Promise<FamilyInvite> {
  const email = invitedEmail.trim().toLowerCase();

  const { data, error } = await supabase
    .from("family_invites")
    .insert({
      family_id: familyId,
      invited_email: email,
      token,
      // role/status/expires_at popunjava DB default
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as FamilyInvite;
}

/**
 * Optional safety net: ako iz nekog razloga nema family_members reda (stari user),
 * možemo probati da kreiramo family + membership.
 * (U idealnom slučaju trigger na signup već radi sve.)
 */
export async function getOrCreateFamily(): Promise<string> {
  const userId = await requireUserId();

  const { data: existing, error: findErr } = await supabase
    .from("family_members")
    .select("family_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (findErr) throw findErr;
  if (existing?.family_id) return existing.family_id;

  // Kreiraj novu porodicu
  const { data: fam, error: famErr } = await supabase
    .from("families")
    .insert({ name: "Moja porodica", created_by: userId })
    .select("id")
    .single();

  if (famErr) throw famErr;

  // Upiši membership (admin)
  const { error: memErr } = await supabase.from("family_members").insert({
    family_id: fam.id,
    user_id: userId,
    role: "admin",
  });

  if (memErr) throw memErr;

  // Kreiraj “Beba 1” (ako nije već)
  await supabase.from("babies").insert({
    family_id: fam.id,
    name: "Beba 1",
  });

  return fam.id;
}
