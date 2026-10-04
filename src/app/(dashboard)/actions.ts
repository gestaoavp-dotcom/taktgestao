"use server";

import { getProfile } from "@/lib/profile";
import { refreshEverything } from "@/lib/refresh-app";

/**
 * The header's "Sincronizar": every screen is read again on its next visit,
 * and the caller refreshes the one in front of it. Uploads already do this on
 * their own; the button is for anything changed outside a screen — or for
 * peace of mind after a batch of files.
 */
export async function syncAll(): Promise<{ ok: true } | { error: string }> {
  const profile = await getProfile();
  if (profile?.role !== "dono" && profile?.role !== "operador") {
    return { error: "Só a equipe sincroniza." };
  }
  refreshEverything();
  return { ok: true };
}
