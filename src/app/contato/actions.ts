"use server";

import { createClient } from "@/lib/supabase/server";
import { MARKETPLACES } from "@/lib/marketplaces";

export type LeadState = { ok: true } | { error: string } | null;

const KNOWN_MARKETPLACES = new Set<string>(MARKETPLACES.map((m) => m.value));

function text(formData: FormData, key: string, max: number) {
  const value = String(formData.get(key) ?? "").trim();
  return value ? value.slice(0, max) : null;
}

export async function submitLead(
  _prevState: LeadState,
  formData: FormData,
): Promise<LeadState> {
  const name = text(formData, "name", 120);
  const phone = text(formData, "phone", 30);

  if (!name) return { error: "Informe seu nome." };
  if (!phone || phone.replace(/\D/g, "").length < 10) {
    return { error: "Informe um WhatsApp com DDD." };
  }

  const marketplaces = formData
    .getAll("marketplaces")
    .map(String)
    .filter((m) => KNOWN_MARKETPLACES.has(m));

  const supabase = await createClient();
  const { error } = await supabase.from("leads").insert({
    name,
    phone,
    email: text(formData, "email", 160),
    company: text(formData, "company", 120),
    marketplaces,
    message: text(formData, "message", 1000),
  });

  if (error) return { error: "Não conseguimos enviar agora. Tente de novo em instantes." };
  return { ok: true };
}
