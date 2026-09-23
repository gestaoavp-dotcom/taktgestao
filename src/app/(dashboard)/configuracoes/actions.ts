"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ProfileRole } from "@/lib/types";

export type SettingsState = { ok: true } | { error: string } | null;

const ROLES: ProfileRole[] = ["dono", "operador", "cliente"];

/**
 * Every write here re-reads the caller's own level from the database.
 *
 * The page already hides itself from anyone but an owner, but a server action
 * is a public endpoint: hiding the button does not stop the request. The check
 * that counts is this one.
 */
type Guard =
  | { ok: false; error: string }
  | { ok: true; supabase: Awaited<ReturnType<typeof createClient>>; userId: string };

async function requireOwner(): Promise<Guard> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "Faça login novamente." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", auth.user.id)
    .maybeSingle<{ role: ProfileRole }>();

  if (profile?.role !== "dono") {
    return { ok: false, error: "Só o dono pode alterar acessos." };
  }
  return { ok: true, supabase, userId: auth.user.id };
}

export async function updateProfileAccess(
  _prevState: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const guard = await requireOwner();
  if (!guard.ok) return { error: guard.error };

  const id = formData.get("id") as string;
  const role = formData.get("role") as ProfileRole;
  if (!ROLES.includes(role)) return { error: "Nível inválido." };

  // A client login without a client sees nothing and looks broken; an internal
  // login carrying one is a leftover waiting to confuse a future policy.
  const clientId = (formData.get("client_id") as string) || null;
  if (role === "cliente" && !clientId) {
    return { error: "Um acesso de cliente precisa estar ligado a um cliente." };
  }

  // Locking yourself out is a mistake nobody can undo from inside the app.
  if (id === guard.userId && role !== "dono") {
    return { error: "Você não pode rebaixar o seu próprio acesso." };
  }

  const { error } = await guard.supabase
    .from("profiles")
    .update({ role, client_id: role === "cliente" ? clientId : null })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/configuracoes");
  return { ok: true };
}

export async function updateProfileName(
  _prevState: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const guard = await requireOwner();
  if (!guard.ok) return { error: guard.error };

  const { error } = await guard.supabase
    .from("profiles")
    .update({ name: (formData.get("name") as string) || null })
    .eq("id", formData.get("id") as string);

  if (error) return { error: error.message };

  revalidatePath("/configuracoes");
  return { ok: true };
}
