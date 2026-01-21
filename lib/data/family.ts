import { supabase } from "@/lib/supabase/client";
import type { Baby, Family, FamilyInvite, FamilyMember } from "@/types/db";

export async function getMyFamilyId(): Promise<string> {
  const { data: session } = await supabase.auth.getSession();
  const uid = session.session?.user.id;
  if (!uid) throw new Error("Not logged in");
  const { data, error } = await supabase
    .from("family_members")
    .select("family_id")
    .eq("user_id", uid)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data?.family_id) throw new Error("Family not found");
  return data.family_id as string;
}

export async function listBabies(familyId: string): Promise<Baby[]> {
  const { data, error } = await supabase.from("babies").select("*").eq("family_id", familyId).order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Baby[];
}

export async function updateBabyName(babyId: string, name: string) {
  const { error } = await supabase.from("babies").update({ name }).eq("id", babyId);
  if (error) throw error;
}

export async function addBaby(familyId: string, name = "Beba 2") {
  const { data, error } = await supabase.from("babies").insert({ family_id: familyId, name }).select("*").single();
  if (error) throw error;
  return data as Baby;
}

export async function listFamilyMembers(familyId: string): Promise<FamilyMember[]> {
  const { data, error } = await supabase.from("family_members").select("*").eq("family_id", familyId);
  if (error) throw error;
  return (data ?? []) as FamilyMember[];
}

export async function listInvites(familyId: string): Promise<FamilyInvite[]> {
  const { data, error } = await supabase.from("family_invites").select("*").eq("family_id", familyId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as FamilyInvite[];
}

export async function createInvite(familyId: string, invitedEmail: string, token: string) {
  const { data: session } = await supabase.auth.getSession();
  const uid = session.session?.user.id;
  if (!uid) throw new Error("Not logged in");
  const { data, error } = await supabase
    .from("family_invites")
    .insert({
      family_id: familyId,
      invited_email: invitedEmail.toLowerCase(),
      token,
      role: "parent",
      invited_by: uid,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as FamilyInvite;
}
