"use client";

import { useActionState, useRef, useState } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import type { ClientCredential } from "@/lib/types";
import { MARKETPLACES } from "@/lib/marketplaces";
import { MarketplaceBadge } from "@/components/marketplace-badge";
import {
  deleteCredential,
  revealCredential,
  saveCredential,
} from "@/app/(dashboard)/clientes/[id]/informacoes/actions";

// A password is fetched one at a time, only when asked for, and put back out of
// sight shortly after. The list itself never carries one, so nothing here can
// leak a password that wasn't deliberately opened.

const HIDE_AFTER_MS = 30_000;

const INPUT_CLASS =
  "w-full rounded-lg border border-navy/10 bg-white px-3 py-2 text-sm text-navy outline-none placeholder:text-[#94A0BD] focus:border-blue";

const LABEL_CLASS = "text-[11px] font-semibold uppercase tracking-wide text-[#94A0BD]";

function CredentialForm({
  clientId,
  credential,
  onDone,
}: {
  clientId: string;
  credential?: ClientCredential;
  onDone: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  const [state, formAction, pending] = useActionState(
    async (prev: Parameters<typeof saveCredential>[0], formData: FormData) => {
      const result = await saveCredential(prev, formData);
      if (result && "ok" in result) {
        formRef.current?.reset();
        onDone();
      }
      return result;
    },
    null,
  );

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="client_id" value={clientId} />
      {credential && <input type="hidden" name="id" value={credential.id} />}

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className={LABEL_CLASS}>Loja</span>
          <input
            name="store_name"
            required
            defaultValue={credential?.store_name ?? ""}
            placeholder="Oba Achei"
            className={INPUT_CLASS}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={LABEL_CLASS}>Marketplace</span>
          <select
            name="marketplace"
            defaultValue={credential?.marketplace ?? ""}
            className={INPUT_CLASS}
          >
            <option value="">Nenhum / outro</option>
            {MARKETPLACES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className={LABEL_CLASS}>Do que é esse acesso</span>
        <input
          name="label"
          defaultValue={credential?.label ?? ""}
          placeholder="Seller Center, Ads, conta de e-mail…"
          className={INPUT_CLASS}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className={LABEL_CLASS}>Login</span>
          <input
            name="login"
            autoComplete="off"
            defaultValue={credential?.login ?? ""}
            placeholder="email@loja.com"
            className={INPUT_CLASS}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={LABEL_CLASS}>
            Senha{" "}
            {credential?.has_password && (
              <span className="font-normal normal-case tracking-normal">
                — em branco mantém a atual
              </span>
            )}
          </span>
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder={credential?.has_password ? "••••••••" : "Senha do acesso"}
            className={INPUT_CLASS}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className={LABEL_CLASS}>Endereço de login</span>
        <input
          name="url"
          defaultValue={credential?.url ?? ""}
          placeholder="https://seller.shopee.com.br"
          className={INPUT_CLASS}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={LABEL_CLASS}>Observações</span>
        <textarea
          name="notes"
          rows={2}
          defaultValue={credential?.notes ?? ""}
          placeholder="Segundo fator no celular do cliente, e-mail de recuperação…"
          className={INPUT_CLASS}
        />
      </label>

      {state && "error" in state && (
        <p className="rounded bg-red-50 px-3 py-2 text-xs text-red-700">{state.error}</p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0d1a38] disabled:opacity-60"
        >
          {pending ? "Salvando..." : credential ? "Salvar" : "Adicionar acesso"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg border border-navy/10 px-4 py-2 text-sm font-semibold text-navy transition-colors hover:bg-brand-gray"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setDone(true);
        window.setTimeout(() => setDone(false), 1500);
      }}
      className="rounded p-1 text-[#94A0BD] transition-colors hover:bg-brand-gray hover:text-navy"
    >
      {done ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function CredentialCard({
  clientId,
  credential,
  onEdit,
}: {
  clientId: string;
  credential: ClientCredential;
  onEdit: () => void;
}) {
  const [password, setPassword] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  /** Fetches the password for one use, then lets it fall out of sight again. */
  async function fetchPassword() {
    setBusy(true);
    setError(null);
    const result = await revealCredential(credential.id);
    setBusy(false);

    if ("error" in result) {
      setError(result.error);
      return null;
    }
    return result.password;
  }

  async function reveal() {
    const value = await fetchPassword();
    if (value === null) return;
    setPassword(value);
    window.setTimeout(() => setPassword(null), HIDE_AFTER_MS);
  }

  // Copying without revealing is the common case: the password goes to the
  // clipboard and never to the screen.
  async function copyPassword() {
    const value = password ?? (await fetchPassword());
    if (value === null) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-navy/[.08] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-bold text-navy">{credential.store_name}</p>
          {credential.label && (
            <p className="truncate text-xs text-[#5B647E]">{credential.label}</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {credential.marketplace && <MarketplaceBadge marketplace={credential.marketplace} />}
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Editar acesso de ${credential.store_name}`}
            className="rounded p-1.5 text-[#94A0BD] transition-colors hover:bg-brand-gray hover:text-navy"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <form action={deleteCredential}>
            <input type="hidden" name="id" value={credential.id} />
            <input type="hidden" name="client_id" value={clientId} />
            <button
              type="submit"
              aria-label={`Remover acesso de ${credential.store_name}`}
              className="rounded p-1.5 text-[#94A0BD] transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>

      <dl className="flex flex-col gap-2 text-sm">
        <div className="flex items-center justify-between gap-2 border-t border-navy/[.06] pt-2">
          <dt className={LABEL_CLASS}>Login</dt>
          <dd className="flex min-w-0 items-center gap-1">
            <span className="truncate text-navy" title={credential.login ?? undefined}>
              {credential.login ?? "—"}
            </span>
            {credential.login && <CopyButton value={credential.login} label="Copiar login" />}
          </dd>
        </div>

        <div className="flex items-center justify-between gap-2">
          <dt className={LABEL_CLASS}>Senha</dt>
          <dd className="flex min-w-0 items-center gap-1">
            {!credential.has_password ? (
              <span className="text-[#94A0BD]">não guardada</span>
            ) : password ? (
              <>
                <span className="truncate font-mono text-navy">{password}</span>
                <button
                  type="button"
                  aria-label="Esconder senha"
                  onClick={() => setPassword(null)}
                  className="rounded p-1 text-[#94A0BD] hover:bg-brand-gray hover:text-navy"
                >
                  <EyeOff className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <>
                <span className="font-mono text-[#94A0BD]">••••••••</span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={reveal}
                  aria-label="Revelar senha"
                  title="Revelar por 30 segundos"
                  className="rounded p-1 text-[#94A0BD] transition-colors hover:bg-brand-gray hover:text-navy disabled:opacity-50"
                >
                  <Eye className="h-3.5 w-3.5" />
                </button>
              </>
            )}
            {credential.has_password && (
              <button
                type="button"
                disabled={busy}
                onClick={copyPassword}
                aria-label="Copiar senha"
                title="Copiar sem mostrar"
                className="rounded p-1 text-[#94A0BD] transition-colors hover:bg-brand-gray hover:text-navy disabled:opacity-50"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-green-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            )}
          </dd>
        </div>

        {credential.url && (
          <div className="flex items-center justify-between gap-2">
            <dt className={LABEL_CLASS}>Entrar</dt>
            <dd className="min-w-0">
              <a
                href={credential.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 truncate text-blue hover:underline"
              >
                <span className="truncate">{credential.url.replace(/^https?:\/\//, "")}</span>
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            </dd>
          </div>
        )}
      </dl>

      {credential.notes && (
        <p className="border-t border-navy/[.06] pt-2 text-xs text-[#5B647E]">{credential.notes}</p>
      )}

      {error && <p className="text-xs text-red-700">{error}</p>}
    </li>
  );
}

export function ClientCredentialsCard({
  clientId,
  credentials,
}: {
  clientId: string;
  credentials: ClientCredential[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <section className="flex flex-col gap-5">
      <div className="rounded-lg bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-bold text-navy">
              <KeyRound className="h-4 w-4" />
              Acessos
            </h2>
            <p className="mt-1 max-w-2xl text-xs text-[#5B647E]">
              As senhas são cifradas antes de chegar ao banco, com uma chave que só existe no
              servidor. A lista nunca carrega a senha — ela é buscada uma por vez, quando você
              pede, e some da tela em 30 segundos. Cada vez que alguém revela uma senha, fica
              registrado quem foi e quando.
            </p>
          </div>
          {!adding && (
            <button
              type="button"
              onClick={() => {
                setAdding(true);
                setEditingId(null);
              }}
              className="flex items-center gap-2 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0d1a38]"
            >
              <Plus className="h-4 w-4" />
              Novo acesso
            </button>
          )}
        </div>

        {adding && (
          <div className="mt-4 border-t border-navy/[.08] pt-4">
            <CredentialForm clientId={clientId} onDone={() => setAdding(false)} />
          </div>
        )}
      </div>

      {credentials.length === 0 && !adding ? (
        <p className="rounded-lg bg-white px-5 py-10 text-center text-sm text-[#94A0BD] shadow-sm">
          Nenhum acesso cadastrado ainda.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-4">
          {credentials.map((credential) =>
            editingId === credential.id ? (
              <li
                key={credential.id}
                className="rounded-lg border border-blue/30 bg-white p-4 shadow-sm"
              >
                <CredentialForm
                  clientId={clientId}
                  credential={credential}
                  onDone={() => setEditingId(null)}
                />
              </li>
            ) : (
              <CredentialCard
                key={credential.id}
                clientId={clientId}
                credential={credential}
                onEdit={() => {
                  setEditingId(credential.id);
                  setAdding(false);
                }}
              />
            ),
          )}
        </ul>
      )}
    </section>
  );
}
