"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import type { ClientAccount, ClientChange } from "@/lib/types";
import type { ChangeChannelOption } from "@/lib/client-changes";
import { addChange, deleteChange } from "@/app/(dashboard)/clientes/[id]/actions";
import { DateField } from "@/components/date-field";
import { DictationPanel } from "@/components/dictation-panel";
import type { DictatedChange } from "@/lib/dictation";
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
  "w-full rounded-lg border border-navy/10 bg-white px-3 py-2 text-sm text-navy outline-none placeholder:text-[#94A0BD] focus:border-blue";

const TRUNCATE_CELL = "max-w-[220px] truncate px-5 py-2.5 text-[#5B647E]";

const ALL_TAB = "all";

function formatDate(date: string | null) {
  if (!date) return "—";
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

function channelKeyOf(change: ClientChange) {
  if (change.account_id) return `account:${change.account_id}`;
  if (change.marketplace) return `marketplace:${change.marketplace}`;
  return null;
}

export function ClientChangesTable({
  clientId,
  changes,
  accounts,
  clientMarketplaces,
}: {
  clientId: string;
  changes: ClientChange[];
  accounts: ClientAccount[];
  clientMarketplaces: string[];
}) {
  const [activeTab, setActiveTab] = useState<string>(ALL_TAB);
  const [workspace, setWorkspace] = useState<{ selectedId: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  // Dictation fills the form by remounting it with new defaults, so the fields
  // stay uncontrolled and the person can still edit everything by hand.
  const [draft, setDraft] = useState<DictatedChange>({});
  const [draftVersion, setDraftVersion] = useState(0);
  const [formChannel, setFormChannel] = useState<ChangeChannelOption | null>(null);

  const [state, formAction, pending] = useActionState(
    async (prevState: Parameters<typeof addChange>[0], formData: FormData) => {
      const result = await addChange(prevState, formData);
      if (result && "ok" in result) {
        formRef.current?.reset();
        setDraft({});
        setDraftVersion((v) => v + 1);
      }
      return result;
    },
    null,
  );

  const channelOptions = useMemo(
    () => buildChannelOptions(accounts, clientMarketplaces),
    [accounts, clientMarketplaces],
  );

  const tabs = useMemo(() => {
    const known = new Set(channelOptions.map((o) => o.key));
    const orphanKeys = new Set(
      changes.map(channelKeyOf).filter((k): k is string => !!k && !known.has(k)),
    );
    const orphanTabs = Array.from(orphanKeys).map((key) => {
      const [, value] = key.split(":");
      return { value: key, label: CHANGE_CHANNEL_LABEL[value] ?? value };
    });

    return [
      { value: ALL_TAB, label: "Todos" },
      ...channelOptions.map((o) => ({ value: o.key, label: o.label })),
      ...orphanTabs,
    ];
  }, [changes, channelOptions]);

  const visibleChanges =
    activeTab === ALL_TAB ? changes : changes.filter((c) => channelKeyOf(c) === activeTab);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        {tabs.length > 2 ? (
          <nav className="flex flex-wrap gap-1 border-b border-navy/[.08]">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
                className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
                  activeTab === tab.value
                    ? "border-blue text-blue"
                    : "border-transparent text-[#5B647E] hover:text-navy"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        ) : (
          <div />
        )}
      </div>

      <div className="mb-5 rounded-lg bg-white p-5 shadow-sm">
        <div className="mb-3">
          <h2 className="font-bold text-navy">Registrar alteração</h2>
          <p className="text-xs text-[#94A0BD]">
            Toda mudança feita na conta, com o motivo, a meta esperada e quem fez. Atualize o
            status sempre que houver progresso — nunca deixe em branco.
          </p>
        </div>

        <DictationPanel
          channels={channelOptions}
          onParsed={(parsed) => {
            setDraft(parsed);
            setDraftVersion((v) => v + 1);
            if (parsed.channelKey) {
              setFormChannel(channelOptions.find((o) => o.key === parsed.channelKey) ?? null);
            }
          }}
        />

        <form key={draftVersion} ref={formRef} action={formAction} className="space-y-2">
          <input type="hidden" name="client_id" value={clientId} />
          <input type="hidden" name="marketplace" value={formChannel?.marketplace ?? ""} />
          <input type="hidden" name="account_id" value={formChannel?.accountId ?? ""} />

          <div className="grid grid-cols-4 gap-2">
            <DateField
              name="changed_on"
              defaultValue={draft.changed_on ?? new Date().toISOString().slice(0, 10)}
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
            <select name="category" defaultValue={draft.category ?? ""} className={INPUT_CLASS}>
              <option value="" disabled>
                Categoria
              </option>
              {CHANGE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <select name="status" defaultValue={draft.status ?? "aberta"} className={INPUT_CLASS}>
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
            defaultValue={draft.description ?? ""}
            placeholder="Ação feita — o que foi feito, de forma objetiva"
            className={INPUT_CLASS}
          />

          <div className="grid grid-cols-3 gap-2">
            <input
              name="reason"
              defaultValue={draft.reason ?? ""}
              placeholder="Motivo / Gatilho"
              className={INPUT_CLASS}
            />
            <input
              name="goal"
              defaultValue={draft.goal ?? ""}
              placeholder="Resultado esperado / Métrica"
              className={INPUT_CLASS}
            />
            <input
              name="owner"
              defaultValue={draft.owner ?? ""}
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
              defaultValue={draft.evidence ?? ""}
              placeholder="Observação / Evidência"
              className={`${INPUT_CLASS} col-span-2`}
            />
          </div>

          {state && "error" in state && (
            <p className="rounded bg-red-50 px-3 py-2 text-xs text-red-700">{state.error}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-navy py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0d1a38] disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            {pending ? "Registrando..." : "Registrar alteração"}
          </button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full min-w-[1240px] text-left text-sm">
          <thead className="bg-brand-gray">
            <tr>
              <th className="px-5 py-2 font-semibold text-navy">Data</th>
              <th className="px-5 py-2 font-semibold text-navy">Conta / Canal</th>
              <th className="px-5 py-2 font-semibold text-navy">Categoria</th>
              <th className="px-5 py-2 font-semibold text-navy">Ação feita</th>
              <th className="px-5 py-2 font-semibold text-navy">Motivo</th>
              <th className="px-5 py-2 font-semibold text-navy">Responsável</th>
              <th className="px-5 py-2 font-semibold text-navy">Status</th>
              <th className="px-5 py-2 font-semibold text-navy">Encerramento</th>
              <th className="px-5 py-2 font-semibold text-navy">Resultado esperado</th>
              <th className="px-5 py-2 font-semibold text-navy">Observação</th>
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
                  onClick={() => setWorkspace({ selectedId: change.id })}
                  className="group cursor-pointer border-t border-navy/[.06] hover:bg-brand-gray/40"
                >
                  <td className="whitespace-nowrap px-5 py-2.5 text-[#5B647E]">
                    {formatDate(change.changed_on)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-2.5 text-[#5B647E]">{channelLabel}</td>
                  <td className="whitespace-nowrap px-5 py-2.5 text-[#5B647E]">
                    {change.category ? CHANGE_CATEGORY_LABEL[change.category] ?? change.category : "—"}
                  </td>
                  <td className={TRUNCATE_CELL} title={change.description}>
                    {change.description}
                  </td>
                  <td className={TRUNCATE_CELL} title={change.reason ?? undefined}>
                    {change.reason ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-5 py-2.5 text-[#5B647E]">
                    {change.owner ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-5 py-2.5">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${CHANGE_STATUS_BADGE[change.status]}`}
                    >
                      {CHANGE_STATUSES.find((s) => s.value === change.status)?.label}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-2.5 text-[#5B647E]">
                    {formatDate(change.closed_on)}
                  </td>
                  <td className={TRUNCATE_CELL} title={change.goal ?? undefined}>
                    {change.goal ?? "—"}
                  </td>
                  <td className={TRUNCATE_CELL} title={change.evidence ?? undefined}>
                    {change.evidence ?? "—"}
                  </td>
                  <td className="px-5 py-2.5">
                    <div className="flex items-center justify-end gap-0.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setWorkspace({ selectedId: change.id });
                        }}
                        aria-label={`Editar alteração de ${formatDate(change.changed_on)}`}
                        className="rounded p-1.5 text-[#94A0BD] opacity-0 transition-all hover:bg-white hover:text-navy focus:opacity-100 group-hover:opacity-100"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <form action={deleteChange} onClick={(e) => e.stopPropagation()}>
                        <input type="hidden" name="id" value={change.id} />
                        <input type="hidden" name="client_id" value={clientId} />
                        <button
                          type="submit"
                          aria-label={`Excluir alteração de ${formatDate(change.changed_on)}`}
                          className="rounded p-1.5 text-[#94A0BD] opacity-0 transition-all hover:bg-red-50 hover:text-red-600 focus:opacity-100 group-hover:opacity-100"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!visibleChanges.length && (
              <tr>
                <td colSpan={11} className="px-5 py-8 text-center text-[#94A0BD]">
                  Nenhuma alteração registrada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {workspace && (
        <ChangeWorkspaceModal
          clientId={clientId}
          changes={visibleChanges}
          accounts={accounts}
          channelOptions={channelOptions}
          initialSelectedId={workspace.selectedId}
          defaultChannelKey={activeTab === ALL_TAB ? "" : activeTab}
          onClose={() => setWorkspace(null)}
        />
      )}
    </div>
  );
}
