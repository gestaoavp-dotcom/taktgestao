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

/**
 * Sends a test message to the owner's own address, so the sending account can
 * be checked from here instead of by creating a client. Gmail's refusals
 * ("Invalid login", "Application-specific password required") are passed on
 * as they come: they say exactly what to fix.
 */
export async function sendTestEmail(
  _prevState: SettingsState,
  _formData: FormData,
): Promise<SettingsState> {
  const guard = await requireOwner();
  if (!guard.ok) return { error: guard.error };

  const { emailConfigured, sendEmail } = await import("@/lib/email");
  if (!emailConfigured()) {
    return { error: "O envio ainda não está configurado: faltam SMTP_USER e SMTP_PASS na Vercel." };
  }

  const { data: auth } = await guard.supabase.auth.getUser();
  const to = auth.user?.email;
  if (!to) return { error: "Seu login não tem e-mail para receber o teste." };

  try {
    await sendEmail({
      to,
      subject: "Teste de envio — TAKT Assessoria",
      text: "Se você recebeu esta mensagem, o envio de e-mails do sistema está funcionando.",
    });
  } catch (e) {
    return { error: `O envio falhou: ${(e as Error).message}` };
  }

  return { ok: true };
}

export type AccessLinkState =
  | { ok: true; emailSent: true }
  | { ok: true; emailSent: false; message: string }
  | { error: string }
  | null;

/**
 * Sends a client a one-time link to set its password — creating the login
 * first when the client has none. Also the way back in for a lost first link
 * or a forgotten password: each new link voids the one before it.
 *
 * No password is chosen, shown or stored anywhere on the agency's side.
 */
export async function sendClientAccessLink(
  _prevState: AccessLinkState,
  formData: FormData,
): Promise<AccessLinkState> {
  const guard = await requireOwner();
  if (!guard.ok) return { error: guard.error };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const clientId = String(formData.get("client_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Informe um e-mail válido." };
  if (!clientId) return { error: "Falta o cliente." };

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const { createAccessLink, deliverAccessLink } = await import("@/lib/access-link");
  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return { error: (e as Error).message };
  }

  // A login that reaches nothing is cleared away and made fresh, not reused.
  const { findAbandonedLogin } = await import("@/lib/abandoned-login");
  const abandoned = await findAbandonedLogin(admin, email);
  if (abandoned) await admin.auth.admin.deleteUser(abandoned);

  const { data: existing } = abandoned
    ? { data: null }
    : await admin
        .from("profiles")
        .select("id, role, client_id")
        .eq("email", email)
        .maybeSingle<{ id: string; role: ProfileRole; client_id: string | null }>();

  // A link signs its holder in as the login it belongs to, so it only ever goes
  // to that login's own client — never to an address that belongs to someone else.
  if (existing && (existing.role !== "cliente" || existing.client_id !== clientId)) {
    return { error: "Esse e-mail já é o login de outra pessoa." };
  }

  if (!existing) {
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
    });
    if (error || !created.user) {
      return { error: error?.message ?? "Não foi possível criar o login." };
    }

    const { error: profileError } = await admin.from("profiles").upsert({
      id: created.user.id,
      email,
      name: name || email.split("@")[0],
      role: "cliente",
      client_id: clientId,
      password_changed_at: null,
    });
    if (profileError) {
      await admin.auth.admin.deleteUser(created.user.id);
      return { error: profileError.message };
    }
  }

  let link: string;
  try {
    link = await createAccessLink(admin, email);
  } catch (e) {
    return { error: (e as Error).message };
  }

  revalidatePath(`/clientes/${clientId}/informacoes/acessos`);
  revalidatePath("/configuracoes");

  const delivery = await deliverAccessLink({ name, email }, link);
  return delivery.emailSent
    ? { ok: true, emailSent: true }
    : { ok: true, emailSent: false, message: delivery.message };
}

/**
 * The one way to make a login: with no password, and a one-time link to the
 * person to choose theirs. Any level — a client, the team, another admin.
 */
export async function createLoginWithLink(
  _prevState: AccessLinkState,
  formData: FormData,
): Promise<AccessLinkState> {
  const guard = await requireOwner();
  if (!guard.ok) return { error: guard.error };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const role = formData.get("role") as ProfileRole;
  const clientId = (formData.get("client_id") as string) || null;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Informe um e-mail válido." };
  if (!ROLES.includes(role)) return { error: "Nível inválido." };
  if (role === "cliente" && !clientId) {
    return { error: "Um acesso de cliente precisa estar ligado a um cliente." };
  }

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const { createAccessLink, deliverAccessLink } = await import("@/lib/access-link");
  const { findAbandonedLogin } = await import("@/lib/abandoned-login");
  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const abandoned = await findAbandonedLogin(admin, email);
  if (abandoned) await admin.auth.admin.deleteUser(abandoned);

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (error || !created.user) {
    if (error && /already/i.test(error.message)) {
      return { error: "Esse e-mail já tem login. Para uma nova senha, use o botão na lista acima." };
    }
    return { error: error?.message ?? "Não foi possível criar o login." };
  }

  const { error: profileError } = await admin.from("profiles").upsert({
    id: created.user.id,
    email,
    name: name || email.split("@")[0],
    role,
    client_id: role === "cliente" ? clientId : null,
    password_changed_at: null,
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: profileError.message };
  }

  revalidatePath("/configuracoes");

  let link: string;
  try {
    link = await createAccessLink(admin, email);
  } catch (e) {
    return { error: `Login criado, mas o link não: ${(e as Error).message}` };
  }
  const delivery = await deliverAccessLink({ name, email }, link);
  return delivery.emailSent
    ? { ok: true, emailSent: true }
    : { ok: true, emailSent: false, message: delivery.message };
}

/**
 * A fresh one-time link for a login that already exists — the way back in for
 * a forgotten password. Each link voids the one before; nothing else changes.
 */
export async function sendPasswordLink(
  _prevState: AccessLinkState,
  formData: FormData,
): Promise<AccessLinkState> {
  const guard = await requireOwner();
  if (!guard.ok) return { error: guard.error };

  const id = String(formData.get("id") ?? "");
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const { createAccessLink, deliverAccessLink } = await import("@/lib/access-link");
  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("email, name")
    .eq("id", id)
    .maybeSingle<{ email: string | null; name: string | null }>();
  if (!profile?.email) return { error: "Não achei o e-mail desse login." };

  let link: string;
  try {
    link = await createAccessLink(admin, profile.email);
  } catch (e) {
    return { error: (e as Error).message };
  }
  const delivery = await deliverAccessLink({ name: profile.name ?? "", email: profile.email }, link);
  return delivery.emailSent
    ? { ok: true, emailSent: true }
    : { ok: true, emailSent: false, message: delivery.message };
}
