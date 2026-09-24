"use client";

import { useActionState, useState } from "react";
import { Check, Crown, Mail, ShieldCheck, User } from "lucide-react";
import type { Client, Profile, ProfileRole } from "@/lib/types";
import {
  createUserWithPassword,
  inviteUser,
  updateProfileAccess,
  updateProfileName,
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
    badge: "bg-yellow text-navy",
  },
  {
    value: "operador",
    label: "Operador",
    hint: "O dia a dia de todos os clientes. Não gerencia acessos.",
    icon: ShieldCheck,
    badge: "bg-blue/10 text-blue",
  },
  {
    value: "cliente",
    label: "Cliente",
    hint: "Padrão. Só a aba Clientes, com a pasta do próprio cliente, apenas para visualizar.",
    icon: User,
    badge: "bg-brand-gray text-[#5B647E]",
  },
];

const INPUT_CLASS =
  "rounded-lg border border-navy/10 bg-white px-3 py-2 text-sm text-navy outline-none focus:border-blue";

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
    <li className="flex flex-col gap-3 rounded-lg border border-navy/[.08] bg-white p-4 shadow-sm">
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
                className="w-44 rounded border border-transparent px-1 py-0.5 text-sm font-bold text-navy outline-none hover:border-navy/10 focus:border-blue"
              />
              <button
                type="submit"
                disabled={savingName}
                aria-label="Salvar nome"
                className="rounded p-1 text-[#94A0BD] hover:bg-brand-gray hover:text-navy"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              {nameState && "ok" in nameState && (
                <span className="text-[11px] text-green-700">salvo</span>
              )}
            </form>
            <p className="text-xs text-[#94A0BD]">
              {profile.email}
              {isMe && " · você"}
            </p>
            {profile.role === "cliente" && !profile.client_id && (
              <span className="mt-1 inline-block rounded-full bg-yellow/30 px-2 py-0.5 text-[11px] font-semibold text-navy">
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
            className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0d1a38] disabled:opacity-40"
          >
            {savingAccess ? "Salvando..." : "Aplicar"}
          </button>
        </form>
      </div>

      <p className="text-xs text-[#5B647E]">
        {ROLES.find((r) => r.value === role)?.hint}
        {profile.client_id && role === "cliente" && (
          <span className="ml-1 font-semibold text-navy">
            — {clients.find((c) => c.id === profile.client_id)?.name}
          </span>
        )}
      </p>

      {accessState && "error" in accessState && (
        <p className="rounded bg-red-50 px-3 py-2 text-xs text-red-700">{accessState.error}</p>
      )}
      {accessState && "ok" in accessState && (
        <p className="text-xs text-green-700">Acesso atualizado.</p>
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

function InviteForm({ clients }: { clients: Client[] }) {
  const [role, setRole] = useState<ProfileRole>("cliente");
  // Two ways in, because one of them needs email to work and often it does not.
  const [mode, setMode] = useState<"senha" | "convite">("senha");
  const [state, formAction, sending] = useActionState(
    mode === "senha" ? createUserWithPassword : inviteUser,
    null,
  );

  return (
    <section className="rounded-lg bg-white p-5 shadow-sm">
      <h2 className="mb-1 flex items-center gap-2 font-bold text-navy">
        <Mail className="h-4 w-4" />
        Convidar alguém
      </h2>
      <div className="mb-3 flex gap-1 rounded-lg bg-brand-gray p-1">
        {([
          { value: "senha", label: "Com senha temporária" },
          { value: "convite", label: "Convite por e-mail" },
        ] as const).map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => setMode(m.value)}
            className={`rounded px-3 py-1.5 text-sm font-semibold transition-colors ${
              mode === m.value ? "bg-white text-navy shadow-sm" : "text-[#5B647E] hover:text-navy"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <p className="mb-4 max-w-2xl text-xs text-[#5B647E]">
        {mode === "senha" ? (
          <>
            Você define uma senha temporária e passa para a pessoa. Ela vale{" "}
            <strong className="text-navy">uma entrada só</strong>: no primeiro acesso o sistema
            exige que ela crie a própria, e a partir daí ninguém aqui sabe qual é. A temporária não
            fica guardada em lugar nenhum.
          </>
        ) : (
          <>
            O Supabase manda o e-mail e a pessoa escolhe a própria senha pelo link. Depende do
            envio de e-mail estar configurado — se não chegar, use a senha temporária.
          </>
        )}
      </p>

      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[240px] flex-1 flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[#94A0BD]">
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
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[#94A0BD]">
            Nome
          </span>
          <input name="name" placeholder="Opcional" className={INPUT_CLASS + " w-full"} />
        </label>

        {mode === "senha" && (
          <label className="flex min-w-[180px] flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#94A0BD]">
              Senha temporária
            </span>
            <input
              name="password"
              autoComplete="off"
              required
              placeholder="Pelo menos 8 caracteres"
              className={INPUT_CLASS + " w-full"}
            />
          </label>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[#94A0BD]">
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
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#94A0BD]">
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
          className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0d1a38] disabled:opacity-60"
        >
          {sending
            ? "Criando..."
            : mode === "senha"
              ? "Criar acesso"
              : "Enviar convite"}
        </button>
      </form>

      <p className="mt-3 max-w-2xl text-xs text-[#5B647E]">
        {ROLES.find((r) => r.value === role)?.hint}
      </p>

      {state && "error" in state && (
        <p className="mt-3 rounded bg-red-50 px-3 py-2 text-xs text-red-700">{state.error}</p>
      )}
      {state && "ok" in state && (
        <p className="mt-3 rounded bg-green-50 px-3 py-2 text-xs text-green-800">
          {mode === "senha"
            ? "Acesso criado. Passe o e-mail e a senha temporária para a pessoa — a mensagem pronta está na aba Acessos do cliente."
            : "Convite enviado. A pessoa aparece na lista assim que aceitar."}
        </p>
      )}
    </section>
  );
}
