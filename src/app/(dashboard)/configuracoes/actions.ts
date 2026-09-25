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
 * Invites someone by email and places them in one step.
 *
 * Creating a login is the only thing in this app that needs the service-role
 * key, and it never leaves the server. The owner check above runs first, and
 * it reads the caller's level from the database rather than trusting anything
 * the request carried.
 *
 * Supabase sends the email; the person sets their own password from the link.
 * We never see it, and never set one for them.
 */
export async function inviteUser(
  _prevState: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const guard = await requireOwner();
  if (!guard.ok) return { error: guard.error };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = formData.get("role") as ProfileRole;
  const clientId = (formData.get("client_id") as string) || null;
  const name = (formData.get("name") as string)?.trim() || null;

  if (!email.includes("@")) return { error: "Informe um e-mail válido." };
  if (!ROLES.includes(role)) return { error: "Nível inválido." };
  if (role === "cliente" && !clientId) {
    return { error: "Um acesso de cliente precisa estar ligado a um cliente." };
  }

  const { createAdminClient } = await import("@/lib/supabase/admin");
  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email);

  if (error) {
    // The commonest case by far, and worth saying plainly rather than passing
    // the raw message through.
    if (/already/i.test(error.message)) {
      return { error: "Esse e-mail já tem login. Ajuste o nível dele na lista acima." };
    }
    return { error: error.message };
  }
  if (!data.user) return { error: "O convite não retornou um usuário." };

  // Placed now, so the person arrives already where they belong instead of
  // spending their first visit at the most restricted level.
  const { error: profileError } = await admin.from("profiles").upsert({
    id: data.user.id,
    email,
    name: name ?? email.split("@")[0],
    role,
    client_id: role === "cliente" ? clientId : null,
  });

  if (profileError) return { error: profileError.message };

  revalidatePath("/configuracoes");
  return { ok: true };
}

/**
 * Creates a login with a temporary password, for when email cannot be relied
 * on — which is most of the time before a project has its own SMTP.
 *
 * The password is chosen by the owner, handed to Supabase, and kept nowhere
 * here: it is not stored, not logged, and not returned. It works exactly once,
 * because the profile is left with no password_changed_at and the middleware
 * sends such a login to the change-password page and nowhere else.
 */
export async function createUserWithPassword(
  _prevState: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const guard = await requireOwner();
  if (!guard.ok) return { error: guard.error };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = formData.get("role") as ProfileRole;
  const clientId = (formData.get("client_id") as string) || null;
  const name = (formData.get("name") as string)?.trim() || null;

  if (!email.includes("@")) return { error: "Informe um e-mail válido." };
  if (password.length < 8) return { error: "A senha temporária precisa ter ao menos 8 caracteres." };
  if (!ROLES.includes(role)) return { error: "Nível inválido." };
  if (role === "cliente" && !clientId) {
    return { error: "Um acesso de cliente precisa estar ligado a um cliente." };
  }

  const { createAdminClient } = await import("@/lib/supabase/admin");
  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return { error: (e as Error).message };
  }

  // Confirmed on creation, because no confirmation mail is going to arrive.
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    if (/already/i.test(error.message)) {
      return { error: "Esse e-mail já tem login. Ajuste o nível dele na lista acima." };
    }
    return { error: error.message };
  }
  if (!data.user) return { error: "A criação não retornou um usuário." };

  // password_changed_at stays null on purpose: that is what makes the
  // temporary password good for one entry and no more.
  const { error: profileError } = await admin.from("profiles").upsert({
    id: data.user.id,
    email,
    name: name ?? email.split("@")[0],
    role,
    client_id: role === "cliente" ? clientId : null,
    password_changed_at: null,
  });

  if (profileError) return { error: profileError.message };

  revalidatePath("/configuracoes");
  return { ok: true };
}

/**
 * Sets a new temporary password on a login that already exists.
 *
 * Needed for two ordinary cases: an invitation that never arrived, leaving an
 * account with no password at all, and someone who has forgotten theirs. Both
 * end the same way — the password is good for one entry, because this clears
 * password_changed_at and the middleware then allows nothing but the
 * change-password page.
 */
export async function resetTemporaryPassword(
  _prevState: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const guard = await requireOwner();
  if (!guard.ok) return { error: guard.error };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "A senha temporária precisa ter ao menos 8 caracteres." };

  const { createAdminClient } = await import("@/lib/supabase/admin");
  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle<{ id: string }>();

  if (!profile) return { error: "Não achei um login com esse e-mail." };

  // An account created by invitation has no password and no confirmed email;
  // both are settled here, since no confirmation mail is going to arrive.
  const { error } = await admin.auth.admin.updateUserById(profile.id, {
    password,
    email_confirm: true,
  });
  if (error) return { error: error.message };

  const { error: profileError } = await admin
    .from("profiles")
    .update({ password_changed_at: null })
    .eq("id", profile.id);
  if (profileError) return { error: profileError.message };

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
