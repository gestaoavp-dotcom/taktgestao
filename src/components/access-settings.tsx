"use client";

import { useActionState, useState } from "react";
import { Check, Crown, ShieldCheck, User } from "lucide-react";
import type { Client, Profile, ProfileRole } from "@/lib/types";
import {
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
    label: "Dono",
    hint: "Tudo: clientes, financeiro, senhas dos marketplaces e estes acessos.",
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
    hint: "Só o próprio cliente, e nunca a aba de Acessos.",
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

      <section className="rounded-lg bg-white p-5 shadow-sm">
        <h2 className="mb-1 font-bold text-navy">Adicionar alguém</h2>
        <p className="text-sm text-[#5B647E]">
          Convide pelo painel do Supabase, em <strong className="text-navy">Authentication →
          Users → Invite user</strong>. Quem entrar aparece aqui na primeira vez que abrir o
          sistema, já no nível mais restrito — é você que decide até onde a pessoa vai.
        </p>
      </section>

      <section className="rounded-lg bg-yellow/10 p-5">
        <h2 className="mb-1 font-bold text-navy">Os níveis ainda não estão sendo aplicados</h2>
        <p className="text-sm text-[#5B647E]">
          Estes acessos já ficam gravados, mas as regras que usam eles não existem ainda: hoje
          qualquer pessoa logada continua vendo tudo, inclusive as senhas dos marketplaces.
          Enquanto isso não for feito, não crie um login de cliente.
        </p>
      </section>
    </div>
  );
}
