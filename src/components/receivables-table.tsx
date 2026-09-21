"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { MARKETPLACE_LABEL } from "@/lib/marketplaces";
import { markPaid, unmarkPaid } from "@/app/(dashboard)/financas/actions";

export type ChargeStatus = "paid" | "pending" | "overdue" | "unset";

export type Charge = {
  accountId: string;
  storeName: string;
  marketplace: string;
  cnpj: string | null;
  fee: number | null;
  paymentMethod: string | null;
  dueDate: string | null;
  paidOn: string | null;
  status: ChargeStatus;
};

export type ClientRow = {
  id: string;
  name: string;
  storeName: string | null;
  charges: Charge[];
  total: number;
};

const STATUS: Record<ChargeStatus, { label: string; className: string }> = {
  paid: { label: "Pago", className: "bg-green-50 text-green-700" },
  pending: { label: "A vencer", className: "bg-blue/10 text-blue" },
  overdue: { label: "Atrasado", className: "bg-red-50 text-red-700" },
  unset: { label: "Sem mensalidade", className: "bg-brand-gray text-[#5B647E]" },
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(date: string | null) {
  if (!date) return "—";
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

/** One badge per status present among the stores, with how many are in it. */
function summaryOf(charges: Charge[]) {
  const order: ChargeStatus[] = ["overdue", "pending", "paid", "unset"];
  return order
    .map((status) => ({ status, count: charges.filter((c) => c.status === status).length }))
    .filter((entry) => entry.count > 0);
}

export function ReceivablesTable({
  clients,
  referenceMonth,
}: {
  clients: ClientRow[];
  referenceMonth: string;
}) {
  const [expanded, setExpanded] = useState<string[]>([]);

  const toggle = (id: string) =>
    setExpanded((current) =>
      current.includes(id) ? current.filter((c) => c !== id) : [...current, id],
    );

  return (
    <div className="overflow-hidden rounded-lg bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="bg-brand-gray">
          <tr>
            <th className="px-5 py-2.5 font-semibold text-navy">Cliente</th>
            <th className="px-5 py-2.5 font-semibold text-navy">Lojas</th>
            <th className="px-5 py-2.5 font-semibold text-navy">Total mensal</th>
            <th className="px-5 py-2.5 font-semibold text-navy">Situação</th>
            <th className="px-5 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => {
            const isOpen = expanded.includes(client.id);

            return (
              <Fragment key={client.id}>
                <tr className="border-t border-navy/[.06]">
                  <td className="px-5 py-3">
                    <Link
                      href={`/clientes/${client.id}`}
                      className="font-semibold text-navy hover:text-blue"
                    >
                      {client.name}
                    </Link>
                    {client.storeName && (
                      <p className="text-xs text-[#94A0BD]">{client.storeName}</p>
                    )}
                  </td>
                  <td className="px-5 py-3 text-[#5B647E]">
                    {client.charges.length}{" "}
                    {client.charges.length === 1 ? "loja" : "lojas"}
                  </td>
                  <td className="px-5 py-3 font-semibold text-navy">
                    {client.total > 0 ? formatCurrency(client.total) : "—"}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {summaryOf(client.charges).map(({ status, count }) => (
                        <span
                          key={status}
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS[status].className}`}
                        >
                          {count} {STATUS[status].label.toLowerCase()}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right">
                    {client.charges.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => toggle(client.id)}
                        aria-expanded={isOpen}
                        className="inline-flex items-center gap-1 rounded-lg border border-navy/10 px-3 py-1.5 text-xs font-semibold text-navy transition-colors hover:bg-brand-gray"
                      >
                        {isOpen ? (
                          <ChevronDown className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5" />
                        )}
                        Detalhe
                      </button>
                    ) : (
                      <Link
                        href={`/clientes/${client.id}/informacoes`}
                        className="text-xs font-semibold text-blue hover:underline"
                      >
                        Cadastrar loja
                      </Link>
                    )}
                  </td>
                </tr>

                {isOpen &&
                  client.charges.map((charge) => (
                    <tr key={charge.accountId} className="border-t border-navy/[.04] bg-brand-gray/30">
                      <td className="py-2.5 pl-10 pr-5">
                        <p className="text-sm text-navy">{charge.storeName}</p>
                        <p className="text-xs text-[#94A0BD]">
                          {MARKETPLACE_LABEL[charge.marketplace] ?? charge.marketplace}
                          {charge.cnpj ? ` · ${charge.cnpj}` : ""}
                        </p>
                      </td>
                      <td className="px-5 py-2.5 text-xs text-[#5B647E]">
                        {charge.paymentMethod ?? "—"}
                      </td>
                      <td className="px-5 py-2.5 text-navy">
                        {charge.fee ? formatCurrency(Number(charge.fee)) : "—"}
                        <p className="text-xs text-[#94A0BD]">
                          vence {formatDate(charge.dueDate)}
                        </p>
                      </td>
                      <td className="px-5 py-2.5">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS[charge.status].className}`}
                        >
                          {STATUS[charge.status].label}
                        </span>
                        {charge.paidOn && (
                          <p className="mt-1 text-xs text-[#94A0BD]">
                            em {formatDate(charge.paidOn)}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        {charge.status === "unset" && (
                          <Link
                            href={`/clientes/${client.id}/informacoes`}
                            className="text-xs font-semibold text-blue hover:underline"
                          >
                            Definir mensalidade
                          </Link>
                        )}
                        {charge.status === "paid" && (
                          <form action={unmarkPaid}>
                            <input type="hidden" name="account_id" value={charge.accountId} />
                            <input
                              type="hidden"
                              name="reference_month"
                              value={referenceMonth}
                            />
                            <button
                              type="submit"
                              className="text-xs font-semibold text-[#94A0BD] transition-colors hover:text-red-600 hover:underline"
                            >
                              Desfazer
                            </button>
                          </form>
                        )}
                        {(charge.status === "pending" || charge.status === "overdue") && (
                          <form action={markPaid}>
                            <input type="hidden" name="client_id" value={client.id} />
                            <input type="hidden" name="account_id" value={charge.accountId} />
                            <input
                              type="hidden"
                              name="reference_month"
                              value={referenceMonth}
                            />
                            <input type="hidden" name="amount" value={String(charge.fee)} />
                            <input
                              type="hidden"
                              name="due_date"
                              value={charge.dueDate ?? referenceMonth}
                            />
                            <button
                              type="submit"
                              className="rounded-lg bg-navy px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#0d1a38]"
                            >
                              Marcar como pago
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  ))}
              </Fragment>
            );
          })}

          {!clients.length && (
            <tr>
              <td colSpan={5} className="px-5 py-10 text-center text-[#94A0BD]">
                Nenhum cliente cadastrado ainda. Cadastre em{" "}
                <Link href="/clientes" className="font-semibold text-blue hover:underline">
                  Clientes
                </Link>
                .
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
