import type { ClientCnpj, ClientFeeChange } from "@/lib/types";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(date: string) {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

export function ClientFeeHistoryCard({
  cnpjs,
  feeChanges,
}: {
  cnpjs: ClientCnpj[];
  feeChanges: ClientFeeChange[];
}) {
  const cnpjById = new Map(cnpjs.map((c) => [c.id, c]));

  return (
    <section className="overflow-hidden rounded-lg bg-white shadow-sm">
      <div className="border-b border-navy/[.08] px-5 py-4">
        <h2 className="font-bold text-navy">Histórico de reajustes</h2>
        <p className="text-xs text-[#94A0BD]">
          Toda alteração no valor cobrado, com a data em que passou a valer.
        </p>
      </div>

      {feeChanges.length > 0 ? (
        <table className="w-full text-left text-sm">
          <thead className="bg-brand-gray">
            <tr>
              <th className="px-5 py-2.5 font-semibold text-navy">Data</th>
              <th className="px-5 py-2.5 font-semibold text-navy">CNPJ</th>
              <th className="px-5 py-2.5 font-semibold text-navy">De</th>
              <th className="px-5 py-2.5 font-semibold text-navy">Para</th>
              <th className="px-5 py-2.5 font-semibold text-navy">Observação</th>
            </tr>
          </thead>
          <tbody>
            {feeChanges.map((change) => {
              const cnpj = cnpjById.get(change.cnpj_id);

              return (
                <tr key={change.id} className="border-t border-navy/[.06]">
                  <td className="whitespace-nowrap px-5 py-2.5 text-navy">
                    {formatDate(change.effective_on)}
                  </td>
                  <td className="px-5 py-2.5">
                    <span className="text-navy">{cnpj?.label ?? "—"}</span>
                    {cnpj && <p className="text-xs text-[#94A0BD]">{cnpj.cnpj}</p>}
                  </td>
                  <td className="px-5 py-2.5 text-[#5B647E]">
                    {change.previous_amount !== null
                      ? formatCurrency(Number(change.previous_amount))
                      : "—"}
                  </td>
                  <td className="px-5 py-2.5 font-semibold text-navy">
                    {formatCurrency(Number(change.amount))}
                  </td>
                  <td className="px-5 py-2.5 text-[#5B647E]">{change.note ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <p className="px-5 py-8 text-center text-sm text-[#94A0BD]">
          Nenhum reajuste registrado ainda. Ao mudar a mensalidade de um CNPJ no card
          Financeiro, o registro aparece aqui.
        </p>
      )}
    </section>
  );
}
