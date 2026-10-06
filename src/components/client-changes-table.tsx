"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import type { ClientAccount, ClientChange } from "@/lib/types";
import type { ChangeChannelOption } from "@/lib/client-changes";
import { addChange, deleteChange } from "@/app/(dashboard)/clientes/[id]/actions";
import { DateField } from "@/components/date-field";
import {
  buildChannelOptions,
  CHANGE_CATEGORIES,
  CHANGE_CATEGORY_LABEL,
  CHANGE_CHANNEL_LABEL,
  CHANGE_STATUSES,
  CHANGE_STATUS_BADGE,
} from "@/lib/client-changes";
import { ChangeWorkspaceModal } from "@/components/change-workspace-modal";

const INPUT_CLASS =
  "w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-3 focus:border-accent";

const TRUNCATE_CELL = "max-w-[220px] truncate px-5 py-2.5 text-ink-2";

const ALL_TAB = "all";

function formatDate(date: string | null) {
  if (!date) return "—";
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

export function ClientChangesTable({
  clientId,
  changes,
  accounts,
  clientMarketplaces,
  readOnly = false,
}: {
  clientId: string;
  changes: ClientChange[];
  accounts: ClientAccount[];
  clientMarketplaces: string[];
  /** A client login: sees the log, registers and edits nothing. */
  readOnly?: boolean;
}) {
  // Two levels instead of one long row: the marketplace first, and the store
  // only when that marketplace has more than one. A flat list repeated the
  // client's name on every tab and grew with every store added.
  const [activeMarketplace, setActiveMarketplace] = useState<string>(ALL_TAB);
  const [activeAccount, setActiveAccount] = useState<string>(ALL_TAB);
  const [workspace, setWorkspace] = useState<{ selectedId: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [formChannel, setFormChannel] = useState<ChangeChannelOption | null>(null);

  const [state, formAction, pending] = useActionState(
    async (prevState: Parameters<typeof addChange>[0], formData: FormData) => {
      const result = await addChange(prevState, formData);
      if (result && "ok" in result) {
        formRef.current?.reset();
      }
      return result;
    },
    null,
  );

  const channelOptions = useMemo(
    () => buildChannelOptions(accounts, clientMarketplaces),
    [accounts, clientMarketplaces],
  );

  const marketplaceTabs = useMemo(() => {
    const seen = new Map<string, { value: string; label: string; count: number }>();

    const add = (value: string) => {
      if (!seen.has(value)) {
        seen.set(value, { value, label: CHANGE_CHANNEL_LABEL[value] ?? value, count: 0 });
      }
      return seen.get(value)!;
    };

    // Every channel the client is set up for, plus any a change was logged
    // against before that setup existed.
    for (const option of channelOptions) add(option.marketplace);
    for (const change of changes) if (change.marketplace) add(change.marketplace).count += 1;

    return [
      { value: ALL_TAB, label: "Todos", count: changes.length },
      ...[...seen.values()],
    ];
  }, [changes, channelOptions]);

  /** Stores of the chosen marketplace — asked about only when there are two. */
  const storeTabs = useMemo(() => {
    if (activeMarketplace === ALL_TAB) return [];
    const stores = channelOptions.filter(
      (o) => o.marketplace === activeMarketplace && o.accountId,
    );
    if (stores.length < 2) return [];

    const count = (accountId: string) =>
      changes.filter((c) => c.account_id === accountId).length;

    return [
      {
        value: ALL_TAB,
        label: "Todas as lojas",
        count: changes.filter((c) => c.marketplace === activeMarketplace).length,
      },
      ...stores.map((o) => ({
        value: o.accountId as string,
        label: o.label.split(" — ").slice(1).join(" — ") || o.label,
        count: count(o.accountId as string),
      })),
    ];
  }, [activeMarketplace, channelOptions, changes]);

  /**
   * What a new change should default to, given what is on screen. A single
   * store under the chosen marketplace is as good as having picked it.
   */
  const activeChannelKey = (() => {
    if (activeAccount !== ALL_TAB) return `account:${activeAccount}`;
    if (activeMarketplace === ALL_TAB) return "";
    const stores = channelOptions.filter((o) => o.marketplace === activeMarketplace);
    if (stores.length === 1) return stores[0].key;
    return `marketplace:${activeMarketplace}`;
  })();

  const visibleChanges = changes.filter(
    (c) =>
      (activeMarketplace === ALL_TAB || c.marketplace === activeMarketplace) &&
      (activeAccount === ALL_TAB || c.account_id === activeAccount),
  );

  return (
    <div>
      {marketplaceTabs.length > 2 && (
        <div className="mb-4">
          <nav className="flex flex-wrap gap-1 border-b border-line">
            {marketplaceTabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => {
                  setActiveMarketplace(tab.value);
                  setActiveAccount(ALL_TAB);
                }}
                className={`-mb-px flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
                  activeMarketplace === tab.value
                    ? "border-accent text-accent-ink"
                    : "border-transparent text-ink-2 hover:text-ink"
                }`}
              >
                {tab.label}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    activeMarketplace === tab.value
                      ? "bg-accent/10 text-accent-ink"
                      : "bg-panel-2 text-ink-3"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>

          {storeTabs.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3">
                Loja
              </span>
              {storeTabs.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setActiveAccount(tab.value)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                    activeAccount === tab.value
                      ? "bg-action text-on-accent"
                      : "border border-line text-ink-2 hover:bg-panel-2"
                  }`}
                >
                  {tab.label}
                  <span className="ml-1.5 opacity-60">{tab.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {!readOnly && (
      <div className="mb-5 rounded-lg bg-panel p-5 shadow-sm">
        <div className="mb-3">
          <h2 className="font-bold text-ink">Registrar alteração</h2>
          <p className="text-xs text-ink-3">
            Toda mudança feita na conta, com o motivo, a meta esperada e quem fez. Atualize o
            status sempre que houver progresso — nunca deixe em branco.
          </p>
        </div>


        <form ref={formRef} action={formAction} className="space-y-2">
          <input type="hidden" name="client_id" value={clientId} />
          <input type="hidden" name="marketplace" value={formChannel?.marketplace ?? ""} />
          <input type="hidden" name="account_id" value={formChannel?.accountId ?? ""} />

          <div className="grid grid-cols-4 gap-2">
            <DateField
              name="changed_on"
              defaultValue={new Date().toISOString().slice(0, 10)}
              className={`flex items-center justify-between ${INPUT_CLASS}`}
            />
            <select
              value={formChannel?.key ?? ""}
              onChange={(e) =>
                setFormChannel(channelOptions.find((o) => o.key === e.target.value) ?? null)
              }
              className={INPUT_CLASS}
            >
              <option value="" disabled>
                Conta / Canal
              </option>
              {channelOptions.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
            <select name="category" defaultValue={""} className={INPUT_CLASS}>
              <option value="" disabled>
                Categoria
              </option>
              {CHANGE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <select name="status" defaultValue={"aberta"} className={INPUT_CLASS}>
              {CHANGE_STATUSES.map((st) => (
                <option key={st.value} value={st.value}>
                  {st.label}
                </option>
              ))}
            </select>
          </div>

          <input
            name="description"
            required
            defaultValue={""}
            placeholder="Ação feita — o que foi feito, de forma objetiva"
            className={INPUT_CLASS}
          />

          <div className="grid grid-cols-3 gap-2">
            <input
              name="reason"
              defaultValue={""}
              placeholder="Motivo / Gatilho"
              className={INPUT_CLASS}
            />
            <input
              name="goal"
              defaultValue={""}
              placeholder="Resultado esperado / Métrica"
              className={INPUT_CLASS}
            />
            <input
              name="owner"
              defaultValue={""}
              placeholder="Responsável(is)"
              className={INPUT_CLASS}
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <DateField
              name="closed_on"
              placeholder="Encerramento"
              className={`flex items-center justify-between ${INPUT_CLASS}`}
            />
            <input
              name="evidence"
              defaultValue={""}
              placeholder="Observação / Evidência"
              className={`${INPUT_CLASS} col-span-2`}
            />
          </div>

          {state && "error" in state && (
            <p className="rounded bg-danger/10 px-3 py-2 text-xs text-danger">{state.error}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-action py-2 text-sm font-semibold text-on-accent transition-colors hover:opacity-90 disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            {pending ? "Registrando..." : "Registrar alteração"}
          </button>
        </form>
      </div>
      )}

      <div className="overflow-x-auto rounded-lg bg-panel shadow-sm">
        <table className="w-full min-w-[1240px] text-left text-sm">
          <thead className="bg-panel-2">
            <tr>
              <th className="px-5 py-2 font-semibold text-ink">Data</th>
              <th className="px-5 py-2 font-semibold text-ink">Conta / Canal</th>
              <th className="px-5 py-2 font-semibold text-ink">Categoria</th>
              <th className="px-5 py-2 font-semibold text-ink">Ação feita</th>
              <th className="px-5 py-2 font-semibold text-ink">Motivo</th>
              <th className="px-5 py-2 font-semibold text-ink">Responsável</th>
              <th className="px-5 py-2 font-semibold text-ink">Status</th>
              <th className="px-5 py-2 font-semibold text-ink">Encerramento</th>
              <th className="px-5 py-2 font-semibold text-ink">Resultado esperado</th>
              <th className="px-5 py-2 font-semibold text-ink">Observação</th>
              <th className="px-5 py-2" />
            </tr>
          </thead>
          <tbody>
            {visibleChanges.map((change) => {
              const account = accounts.find((a) => a.id === change.account_id);
              const channelLabel = account
                ? `${CHANGE_CHANNEL_LABEL[account.marketplace] ?? account.marketplace} — ${account.store_name}`
                : change.marketplace
                  ? CHANGE_CHANNEL_LABEL[change.marketplace] ?? change.marketplace
                  : "—";

              return (
                <tr
                  key={change.id}
                  onClick={readOnly ? undefined : () => setWorkspace({ selectedId: change.id })}
                  className={`group border-t border-line-soft ${
                    readOnly ? "" : "cursor-pointer hover:bg-panel-2/40"
                  }`}
                >
                  <td className="whitespace-nowrap px-5 py-2.5 text-ink-2">
                    {formatDate(change.changed_on)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-2.5 text-ink-2">{channelLabel}</td>
                  <td className="whitespace-nowrap px-5 py-2.5 text-ink-2">
                    {change.category ? CHANGE_CATEGORY_LABEL[change.category] ?? change.category : "—"}
                  </td>
                  <td className={TRUNCATE_CELL} title={change.description}>
                    {change.description}
                  </td>
                  <td className={TRUNCATE_CELL} title={change.reason ?? undefined}>
                    {change.reason ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-5 py-2.5 text-ink-2">
                    {change.owner ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-5 py-2.5">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${CHANGE_STATUS_BADGE[change.status]}`}
                    >
                      {CHANGE_STATUSES.find((s) => s.value === change.status)?.label}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-2.5 text-ink-2">
                    {formatDate(change.closed_on)}
                  </td>
                  <td className={TRUNCATE_CELL} title={change.goal ?? undefined}>
                    {change.goal ?? "—"}
                  </td>
                  <td className={TRUNCATE_CELL} title={change.evidence ?? undefined}>
                    {change.evidence ?? "—"}
                  </td>
                  <td className="px-5 py-2.5">
                    {!readOnly && (
                    <div className="flex items-center justify-end gap-0.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setWorkspace({ selectedId: change.id });
                        }}
                        aria-label={`Editar alteração de ${formatDate(change.changed_on)}`}
                        className="rounded p-1.5 text-ink-3 opacity-0 transition-all hover:bg-panel hover:text-ink focus:opacity-100 group-hover:opacity-100"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <form action={deleteChange} onClick={(e) => e.stopPropagation()}>
                        <input type="hidden" name="id" value={change.id} />
                        <input type="hidden" name="client_id" value={clientId} />
                        <button
                          type="submit"
                          aria-label={`Excluir alteração de ${formatDate(change.changed_on)}`}
                          className="rounded p-1.5 text-ink-3 opacity-0 transition-all hover:bg-danger/10 hover:text-danger focus:opacity-100 group-hover:opacity-100"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </form>
                    </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {!visibleChanges.length && (
              <tr>
                <td colSpan={11} className="px-5 py-8 text-center text-ink-3">
                  Nenhuma alteração registrada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {workspace && !readOnly && (
        <ChangeWorkspaceModal
          clientId={clientId}
          changes={visibleChanges}
          accounts={accounts}
          channelOptions={channelOptions}
          initialSelectedId={workspace.selectedId}
          defaultChannelKey={activeChannelKey}
          onClose={() => setWorkspace(null)}
        />
      )}
    </div>
  );
}
