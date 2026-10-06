"use client";

import { useActionState, useState } from "react";
import { Check, Copy, Crown, KeyRound, Mail, ShieldCheck, User } from "lucide-react";
import type { Client, Profile, ProfileRole } from "@/lib/types";
import {
  createLoginWithLink,
  sendPasswordLink,
  updateProfileAccess,
  updateProfileName,
  type AccessLinkState,
} from "@/app/(dashboard)/configuracoes/actions";

const ROLES: {
  value: ProfileRole;
  label: string;
  hint: string;
  icon: typeof Crown;
  badge: string;
}[] = [
  {
    value: "dono",
    label: "Admin",
    hint: "Tudo de todos os clientes, o financeiro, as senhas dos marketplaces e estes acessos.",
    icon: Crown,
    badge: "bg-gold text-ink",
  },
  {
    value: "operador",
    label: "Operador",
    hint: "O dia a dia de todos os clientes. Não gerencia acessos.",
    icon: ShieldCheck,
    badge: "bg-accent/10 text-accent-ink",
  },
  {
    value: "cliente",
    label: "Cliente",
    hint: "Padrão. Só a aba Clientes, com a pasta do próprio cliente, apenas para visualizar.",
    icon: User,
    badge: "bg-panel-2 text-ink-2",
  },
];

const INPUT_CLASS =
  "rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink outline-none focus:border-accent";

function ProfileRow({
  profile,
  clients,
  isMe,
}: {
  profile: Profile;
  clients: Client[];
  isMe: boolean;
}) {
  const [role, setRole] = useState<ProfileRole>(profile.role);
  const [clientId, setClientId] = useState(profile.client_id ?? "");

  const [accessState, accessAction, savingAccess] = useActionState(updateProfileAccess, null);
  const [nameState, nameAction, savingName] = useActionState(updateProfileName, null);

  const meta = ROLES.find((r) => r.value === profile.role)!;
  const Icon = meta.icon;

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-line bg-panel p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`rounded-lg p-2 ${meta.badge}`}>
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <form action={nameAction} className="flex items-center gap-2">
              <input type="hidden" name="id" value={profile.id} />
              <input
                name="name"
                defaultValue={profile.name ?? ""}
                placeholder="Nome da pessoa"
                className="w-44 rounded border border-transparent px-1 py-0.5 text-sm font-bold text-ink outline-none hover:border-line focus:border-accent"
              />
              <button
                type="submit"
                disabled={savingName}
                aria-label="Salvar nome"
                className="rounded p-1 text-ink-3 hover:bg-panel-2 hover:text-ink"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              {nameState && "ok" in nameState && (
                <span className="text-[11px] text-pos">salvo</span>
              )}
            </form>
            <p className="text-xs text-ink-3">
              {profile.email}
              {isMe && " · você"}
            </p>
            {profile.role === "cliente" && !profile.client_id && (
              <span className="mt-1 inline-block rounded-full bg-gold/30 px-2 py-0.5 text-[11px] font-semibold text-ink">
                Aguardando aprovação — ligue a um cliente para liberar
              </span>
            )}
          </div>
        </div>

        <form action={accessAction} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="id" value={profile.id} />
          <select
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value as ProfileRole)}
            className={INPUT_CLASS}
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>

          {/* Only a client login belongs to a client. */}
          {role === "cliente" && (
            <select
              name="client_id"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              required
              className={INPUT_CLASS}
            >
              <option value="">Qual cliente?</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          <button
            type="submit"
            disabled={savingAccess || (role === profile.role && clientId === (profile.client_id ?? ""))}
            className="rounded-lg bg-action px-4 py-2 text-sm font-semibold text-on-accent transition-colors hover:opacity-90 disabled:opacity-40"
          >
            {savingAccess ? "Salvando..." : "Aplicar"}
          </button>
        </form>
      </div>

      <p className="text-xs text-ink-2">
        {ROLES.find((r) => r.value === role)?.hint}
        {profile.client_id && role === "cliente" && (
          <span className="ml-1 font-semibold text-ink">
            — {clients.find((c) => c.id === profile.client_id)?.name}
          </span>
        )}
      </p>

      <PasswordLinkButton profileId={profile.id} />

      {accessState && "error" in accessState && (
        <p className="rounded bg-danger/10 px-3 py-2 text-xs text-danger">{accessState.error}</p>
      )}
      {accessState && "ok" in accessState && (
        <p className="text-xs text-pos">Acesso atualizado.</p>
      )}
    </li>
  );
}

export function AccessSettings({
  profiles,
  clients,
  currentUserId,
}: {
  profiles: Profile[];
  clients: Client[];
  currentUserId: string;
}) {
  return (
    <div className="flex flex-col gap-5">
      <ul className="flex flex-col gap-3">
        {profiles.map((profile) => (
          <ProfileRow
            key={profile.id}
            profile={profile}
            clients={clients}
            isMe={profile.id === currentUserId}
          />
        ))}
      </ul>

      <InviteForm clients={clients} />
    </div>
  );
}

function LinkResult({ state }: { state: AccessLinkState }) {
  const [copied, setCopied] = useState(false);
  if (!state) return null;
  if ("error" in state) {
    return <p className="mt-3 rounded bg-danger/10 px-3 py-2 text-xs text-danger">{state.error}</p>;
  }
  if (state.emailSent) {
    return (
      <p className="mt-3 rounded bg-pos/10 px-3 py-2 text-xs text-pos">
        Link enviado por e-mail. Ele vale uma vez só e expira.
      </p>
    );
  }
  return (
    <div className="mt-3 flex flex-col gap-2">
      <p className="rounded bg-gold/20 px-3 py-2 text-xs text-ink">
        O envio de e-mail não funcionou — mande a mensagem abaixo à pessoa, logo: o link vale
        uma vez só e expira.
      </p>
      <pre className="whitespace-pre-wrap rounded-lg bg-panel-2/60 px-4 py-3 font-sans text-xs text-ink-2">
        {state.message}
      </pre>
      <button
        type="button"
        onClick={() => navigator.clipboard.writeText(state.message).then(() => setCopied(true))}
        className="flex w-fit items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-panel-2"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-pos" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copiado" : "Copiar mensagem"}
      </button>
    </div>
  );
}

function PasswordLinkButton({ profileId }: { profileId: string }) {
  const [state, formAction, sending] = useActionState(sendPasswordLink, null);
  return (
    <div>
      <form action={formAction}>
        <input type="hidden" name="id" value={profileId} />
        <button
          type="submit"
          disabled={sending}
          className="flex items-center gap-1.5 text-xs font-semibold text-accent-ink hover:underline disabled:opacity-60"
        >
          <KeyRound className="h-3.5 w-3.5" />
          {sending ? "Enviando..." : "Enviar link de nova senha"}
        </button>
      </form>
      <LinkResult state={state} />
    </div>
  );
}

function InviteForm({ clients }: { clients: Client[] }) {
  const [role, setRole] = useState<ProfileRole>("cliente");
  const [state, formAction, sending] = useActionState(createLoginWithLink, null);

  return (
    <section className="rounded-lg bg-panel p-5 shadow-sm">
      <h2 className="mb-1 flex items-center gap-2 font-bold text-ink">
        <Mail className="h-4 w-4" />
        Criar acesso
      </h2>
      <p className="mb-4 max-w-2xl text-xs text-ink-2">
        O login nasce sem senha: a pessoa recebe por e-mail um link, de uso único e com prazo,
        para criar a própria. Ninguém aqui define nem vê senha de ninguém.
      </p>

      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[240px] flex-1 flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">
            E-mail
          </span>
          <input
            name="email"
            type="email"
            required
            placeholder="pessoa@empresa.com"
            className={INPUT_CLASS + " w-full"}
          />
        </label>

        <label className="flex min-w-[140px] flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">
            Nome
          </span>
          <input name="name" placeholder="Opcional" className={INPUT_CLASS + " w-full"} />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">
            Nível
          </span>
          <select
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value as ProfileRole)}
            className={INPUT_CLASS}
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </label>

        {role === "cliente" && (
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">
              Cliente
            </span>
            <select name="client_id" required defaultValue="" className={INPUT_CLASS}>
              <option value="">Escolha</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <button
          type="submit"
          disabled={sending}
          className="rounded-lg bg-action px-4 py-2 text-sm font-semibold text-on-accent transition-colors hover:opacity-90 disabled:opacity-60"
        >
          {sending ? "Criando..." : "Criar e enviar link"}
        </button>
      </form>

      <p className="mt-3 max-w-2xl text-xs text-ink-2">
        {ROLES.find((r) => r.value === role)?.hint}
      </p>

      <LinkResult state={state} />
    </section>
  );
}
