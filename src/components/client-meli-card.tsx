"use client";

import { useActionState, useState } from "react";
import { Check, Copy, Link2, Plug, RefreshCw, Unplug } from "lucide-react";
import type { MeliStoreStatus } from "@/lib/types";
import {
  disconnectMeli,
  generateMeliLink,
} from "@/app/(dashboard)/clientes/[id]/informacoes/meli-actions";

// Connecting a client's Mercado Livre account, so the sales arrive by API
// instead of by somebody downloading a spreadsheet once a month.
//
// The link is shown here to be copied, never sent from the app: whoever opens
// it can attach a Mercado Livre account to this store, so it should go out the
// way the team already talks to this client.

const LABEL: Record<MeliStoreStatus["status"], string> = {
  ativa: "Conectada",
  reautorizar: "Precisa reautorizar",
  desativada: "Desconectada",
  sem_conexao: "Nunca conectada",
};

const TONE: Record<MeliStoreStatus["status"], string> = {
  ativa: "bg-pos/10 text-pos",
  reautorizar: "bg-gold/15 text-gold-ink",
  desativada: "bg-panel-2 text-ink-3",
  sem_conexao: "bg-panel-2 text-ink-3",
};

function whenShort(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StoreRow({ clientId, store }: { clientId: string; store: MeliStoreStatus }) {
  const [linkState, linkAction, generating] = useActionState(generateMeliLink, null);
  const [offState, offAction, disconnecting] = useActionState(disconnectMeli, null);
  const [copied, setCopied] = useState(false);

  const link = linkState && "link" in linkState ? linkState : null;
  const lastSync = whenShort(store.last_sync_at);

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="border-b border-line px-5 py-4 last:border-b-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{store.store_name}</p>
          <p className="text-xs text-ink-3">
            {store.connected && store.nickname ? `${store.nickname} · ` : ""}
            {lastSync ? `última sincronização ${lastSync}` : "ainda não sincronizou"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${TONE[store.status]}`}
          >
            {LABEL[store.status]}
          </span>

          <form action={linkAction}>
            <input type="hidden" name="client_id" value={clientId} />
            <input type="hidden" name="account_id" value={store.account_id} />
            <button
              type="submit"
              disabled={generating}
              className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:border-accent disabled:opacity-50"
            >
              {store.status === "ativa" ? (
                <RefreshCw className="h-3.5 w-3.5" />
              ) : (
                <Plug className="h-3.5 w-3.5" />
              )}
              {generating
                ? "Gerando…"
                : store.status === "ativa"
                  ? "Reconectar"
                  : "Gerar link"}
            </button>
          </form>

          {store.connected && (
            <form action={offAction}>
              <input type="hidden" name="client_id" value={clientId} />
              <input type="hidden" name="account_id" value={store.account_id} />
              <button
                type="submit"
                disabled={disconnecting}
                className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-danger hover:border-danger disabled:opacity-50"
              >
                <Unplug className="h-3.5 w-3.5" />
                {disconnecting ? "…" : "Desconectar"}
              </button>
            </form>
          )}
        </div>
      </div>

      {store.status === "reautorizar" && store.last_error && (
        <p className="mt-2 text-xs text-ink-2">
          O Mercado Livre recusou a última renovação: {store.last_error} Gere um link novo e
          peça ao cliente para autorizar de novo.
        </p>
      )}

      {link && (
        <div className="mt-3 rounded-xl bg-panel-2 p-3">
          <p className="mb-2 text-xs text-ink-2">
            Mande este link para o cliente. Vale uma vez só e expira em{" "}
            {new Date(link.expiresAt).toLocaleDateString("pt-BR")}.
          </p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={link.link}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 rounded-lg border border-line bg-panel px-3 py-2 text-xs text-ink outline-none"
            />
            <button
              type="button"
              onClick={() => copy(link.link)}
              className="flex items-center gap-1.5 rounded-lg bg-action px-3 py-2 text-xs font-semibold text-on-accent"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copiado" : "Copiar"}
            </button>
          </div>
        </div>
      )}

      {linkState && "error" in linkState && (
        <p className="mt-2 text-xs text-danger">{linkState.error}</p>
      )}
      {offState && "error" in offState && (
        <p className="mt-2 text-xs text-danger">{offState.error}</p>
      )}
    </div>
  );
}

export function ClientMeliCard({
  clientId,
  stores,
}: {
  clientId: string;
  stores: MeliStoreStatus[];
}) {
  return (
    <section className="lift overflow-hidden rounded-2xl bg-panel shadow-sm">
      <div className="border-b border-line px-5 py-4">
        <h2 className="flex items-center gap-2 font-bold text-ink">
          <Link2 className="h-4 w-4" />
          Conexão com o Mercado Livre
        </h2>
        <p className="text-xs text-ink-3">
          Conectada, a loja manda vendas, tarifas e ads sozinha — sem planilha. O cliente
          autoriza uma vez; nós só lemos, nunca alteramos nada na conta dele.
        </p>
      </div>

      {stores.length > 0 ? (
        stores.map((store) => (
          <StoreRow key={store.account_id} clientId={clientId} store={store} />
        ))
      ) : (
        <p className="px-5 py-6 text-sm text-ink-3">
          Este cliente não tem loja de Mercado Livre cadastrada. Adicione uma em Contas para
          poder conectar.
        </p>
      )}
    </section>
  );
}
