"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import type { ClientAccount, ClientChange } from "@/lib/types";
import { deleteChange } from "@/app/(dashboard)/clientes/[id]/actions";
import {
  buildChannelOptions,
  CHANGE_CATEGORY_LABEL,
  CHANGE_CHANNEL_LABEL,
  CHANGE_STATUSES,
  CHANGE_STATUS_BADGE,
} from "@/lib/client-changes";
import { ChangeWorkspaceModal } from "@/components/change-workspace-modal";

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
        <button
          type="button"
          onClick={() => setWorkspace({ selectedId: "new" })}
          className="flex items-center gap-2 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0d1a38]"
        >
          <Plus className="h-4 w-4" />
          Nova alteração
        </button>
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
