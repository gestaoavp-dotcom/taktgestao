"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAccessLink, deliverAccessLink } from "@/lib/access-link";
import { findAbandonedLogin } from "@/lib/abandoned-login";
import { linkLooseStoresToFirstCnpj } from "@/lib/link-stores";
import { sendClientAccessLink, type AccessLinkState } from "@/app/(dashboard)/configuracoes/actions";

export type CreateClientState =
  | {
      ok: true;
      id: string;
      email: string;
      emailSent: boolean;
      /** Only when the e-mail could not go out, so the admin can pass it on. */
      message?: string;
    }
  | { error: string }
  | null;

function toNumber(value: FormDataEntryValue | null) {
  if (!value) return null;
  const n = Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/**
 * The admin's pré-cadastro: the client, its CNPJ principal and stores, and the
 * client's own login, in one step.
 *
 * Creating a login needs the service-role key, so this is for a dono only —
 * checked here in the database, since a server action can be called by anyone
 * who knows it exists. Each step undoes the ones before it on failure, so no
 * client is left without its login and no login without its client.
 */
export async function createClientRecord(
  _prevState: CreateClientState,
  formData: FormData,
): Promise<CreateClientState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Faça login novamente." };

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", auth.user.id)
    .maybeSingle<{ role: string }>();
  if (me?.role !== "dono") return { error: "Só o admin faz o pré-cadastro de clientes." };

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const contact_phone = (formData.get("contact_phone") as string) || null;
  const cnpj = String(formData.get("cnpj") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim() || null;
  const marketplaces = formData.getAll("marketplaces") as string[];
  const monthly_fee = toNumber(formData.get("monthly_fee"));
  const payment_day = toNumber(formData.get("payment_day"));

  if (!name) return { error: "Informe o nome do cliente." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Informe um e-mail válido." };
  if (cnpj.replace(/\D/g, "").length !== 14) return { error: "Informe o CNPJ completo (14 dígitos)." };

  const { createAdminClient } = await import("@/lib/supabase/admin");
  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return { error: (e as Error).message };
  }

  // The login first: it is the step most likely to be refused (an e-mail that
  // already has one), and nothing else has been written yet when it is. It is
  // made with no password at all — the client sets one through the link.
  const createLogin = () => admin.auth.admin.createUser({ email, email_confirm: true });
  let { data: created, error: userError } = await createLogin();

  // An e-mail can be held by a login that reaches nothing: no profile, or a
  // client-level profile bound to no client (what a deleted client used to
  // leave behind). Such a login is removed and made again from scratch —
  // never reused, since whoever made it may know its password. A login that
  // is in use keeps its e-mail.
  if (userError && /already/i.test(userError.message)) {
    const abandoned = await findAbandonedLogin(admin, email);
    if (!abandoned) {
      return { error: "Esse e-mail já é o login de outra pessoa. Use outro e-mail principal." };
    }
    await admin.auth.admin.deleteUser(abandoned);
    ({ data: created, error: userError } = await createLogin());
  }

  if (userError || !created.user) {
    return { error: userError?.message ?? "Não foi possível criar o login." };
  }
  const userId = created.user.id;
  const undoUser = () => admin.auth.admin.deleteUser(userId);

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .insert({ name, contact_email: email, contact_phone, created_by: auth.user.id })
    .select("id")
    .single<{ id: string }>();
  if (clientError) {
    await undoUser();
    return { error: clientError.message };
  }
  const undoClient = () => supabase.from("clients").delete().eq("id", client.id);

  const { data: cnpjRow, error: cnpjError } = await supabase
    .from("client_cnpjs")
    .insert({
      client_id: client.id,
      cnpj,
      label,
      monthly_fee,
      payment_day,
      created_by: auth.user.id,
    })
    .select("id")
    .single<{ id: string }>();
  if (cnpjError) {
    await undoClient();
    await undoUser();
    return { error: cnpjError.message };
  }

  if (marketplaces.length > 0) {
    await supabase.from("client_accounts").insert(
      marketplaces.map((marketplace) => ({
        client_id: client.id,
        cnpj_id: cnpjRow.id,
        marketplace,
        store_name: label || name,
        created_by: auth.user!.id,
      })),
    );
  }

  // password_changed_at stays empty: the link opens the door once, and that
  // first access is spent choosing a password.
  const { error: profileError } = await admin.from("profiles").upsert({
    id: userId,
    email,
    name,
    role: "cliente",
    client_id: client.id,
    password_changed_at: null,
  });
  if (profileError) {
    await undoClient();
    await undoUser();
    return { error: profileError.message };
  }

  revalidatePath("/clientes");
  revalidatePath("/financas");
  revalidatePath("/configuracoes");

  // The client and its login are in place from here on; a link that fails to
  // generate is no reason to undo them — a new one can be sent from Acessos.
  let link: string;
  try {
    link = await createAccessLink(admin, email);
  } catch (e) {
    return {
      ok: true,
      id: client.id,
      email,
      emailSent: false,
      message: `O cliente foi criado, mas o link não: ${(e as Error).message} Envie um novo pela aba Informações → Acessos.`,
    };
  }

  const delivery = await deliverAccessLink({ name, email }, link);
  return delivery.emailSent
    ? { ok: true, id: client.id, email, emailSent: true }
    : { ok: true, id: client.id, email, emailSent: false, message: delivery.message };
}

export type DeleteClientState = { ok: true } | { error: string } | null;

/**
 * Deleting a client deletes its logins too.
 *
 * The database drops the profile with the client, but not the login behind
 * it: left alone, that login could still sign in — through a link sent
 * earlier, say — and would land with no client, waiting for an approval
 * nobody meant to give. So the logins go first, then the folder.
 *
 * A dono only, and only with its PIN — created right here the first time,
 * when the dono has none yet. Checked on the server against a hash no login
 * can read; see lib/admin-pin.
 */
export async function deleteClientRecord(
  _prevState: DeleteClientState,
  formData: FormData,
): Promise<DeleteClientState> {
  const supabase = await createClient();
  const id = formData.get("id") as string;
  const pin = String(formData.get("pin") ?? "");

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Faça login novamente." };
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", auth.user.id)
    .maybeSingle<{ role: string }>();
  if (me?.role !== "dono") return { error: "Só o admin pode excluir clientes." };

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const { checkPin, createPin, hasPin, isValidPin } = await import("@/lib/admin-pin");
  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return { error: (e as Error).message };
  }

  if (await hasPin(admin, auth.user.id)) {
    const problem = await checkPin(admin, auth.user.id, pin);
    if (problem) return { error: problem };
  } else {
    if (!isValidPin(pin)) return { error: "O PIN precisa ter 4 números." };
    if (pin !== String(formData.get("pin_confirm") ?? "")) {
      return { error: "Os dois PINs não são iguais." };
    }
    const problem = await createPin(admin, auth.user.id, pin);
    if (problem) return { error: problem };
  }

  const { data: logins } = await admin
    .from("profiles")
    .select("id")
    .eq("client_id", id)
    .returns<{ id: string }[]>();
  for (const login of logins ?? []) {
    await admin.auth.admin.deleteUser(login.id);
  }

  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/clientes");
  revalidatePath("/configuracoes");
  return { ok: true };
}

/**
 * Brings a client registered before e-mails were required up to date: its
 * main e-mail, a CNPJ principal when it has none, and its login — sent the
 * same one-time link as a new client. A dono only; the link part is the
 * Acessos action itself, so both paths create logins the same way.
 */
export async function completeClientAccess(
  prevState: AccessLinkState,
  formData: FormData,
): Promise<AccessLinkState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Faça login novamente." };
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", auth.user.id)
    .maybeSingle<{ role: string }>();
  if (me?.role !== "dono") return { error: "Só o admin cria acessos." };

  const clientId = String(formData.get("client_id") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const cnpj = String(formData.get("cnpj") ?? "").trim();
  const needsCnpj = formData.get("needs_cnpj") === "1";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Informe um e-mail válido." };
  if (needsCnpj && cnpj.replace(/\D/g, "").length !== 14) {
    return { error: "Informe o CNPJ completo (14 dígitos)." };
  }

  const { error: emailError } = await supabase
    .from("clients")
    .update({ contact_email: email })
    .eq("id", clientId);
  if (emailError) return { error: emailError.message };

  if (needsCnpj) {
    const { data: created, error: cnpjError } = await supabase
      .from("client_cnpjs")
      .insert({ client_id: clientId, cnpj, created_by: auth.user.id })
      .select("id")
      .single<{ id: string }>();
    if (cnpjError) return { error: cnpjError.message };
    await linkLooseStoresToFirstCnpj(supabase, clientId, created.id);
  }

  const linkData = new FormData();
  linkData.set("client_id", clientId);
  linkData.set("email", email);
  linkData.set("name", String(formData.get("name") ?? ""));

  const result = await sendClientAccessLink(prevState, linkData);
  revalidatePath("/clientes");
  return result;
}
