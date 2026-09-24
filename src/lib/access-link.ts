import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { emailConfigured, sendEmail } from "@/lib/email";
import { SITE_URL } from "@/lib/site";

// How a client gets into its login: a link, never a password.
//
// The link carries a one-time token from Supabase (single use, expiring after
// the project's e-mail OTP window). Nothing in the message can be reused, and
// nobody at the agency ever knows the client's password — the client chooses
// it on the page the link opens.

export type AccessDelivery = { emailSent: true } | { emailSent: false; message: string };

/** A fresh link for an existing login. Each call invalidates the previous one. */
export async function createAccessLink(admin: SupabaseClient, email: string) {
  const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email });
  if (error || !data.properties?.hashed_token) {
    throw new Error(error?.message ?? "Não foi possível gerar o link de acesso.");
  }
  const params = new URLSearchParams({ token_hash: data.properties.hashed_token });
  return `${SITE_URL}/acesso?${params}`;
}

function accessMessage(name: string, link: string) {
  return [
    name ? `Olá, ${name}!` : "Olá!",
    "",
    "Seu acesso à área do cliente da TAKT Assessoria está pronto.",
    "",
    "Clique no link abaixo para criar a sua senha e finalizar o cadastro:",
    link,
    "",
    "O link funciona uma única vez e expira em pouco tempo. Se ele não abrir mais, peça um novo à equipe TAKT.",
  ].join("\n");
}

/**
 * E-mails the link when the deploy has a sending account. Otherwise — or if
 * sending fails — hands the message back so the admin can pass it on.
 */
export async function deliverAccessLink(
  to: { name: string; email: string },
  link: string,
): Promise<AccessDelivery> {
  const message = accessMessage(to.name, link);

  if (emailConfigured()) {
    try {
      await sendEmail({ to: to.email, subject: "Seu acesso à TAKT Assessoria", text: message });
      return { emailSent: true };
    } catch {
      // Fall through: the link is still good, and the admin can send it.
    }
  }
  return { emailSent: false, message };
}
