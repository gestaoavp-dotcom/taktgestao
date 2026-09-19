"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { FileText, Printer } from "lucide-react";
import { MARKETPLACE_LABEL } from "@/lib/marketplaces";
import { REPORT_SECTIONS, type ReportSection } from "@/lib/report";

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const SELECT_CLASS =
  "rounded-lg border border-navy/10 bg-white px-3 py-2 text-sm text-navy outline-none focus:border-blue";

export function ReportOptions({
  month,
  marketplace,
  sections,
  availableMonths,
  clientMarketplaces,
  generated,
}: {
  month: string;
  marketplace: string;
  sections: ReportSection[];
  availableMonths: string[];
  clientMarketplaces: string[];
  generated: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const update = (changes: Record<string, string>) => {
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(changes)) params.set(key, value);
    params.set("gerar", "1");
    router.push(`${pathname}?${params}`);
  };

  const toggleSection = (value: ReportSection) => {
    const next = sections.includes(value)
      ? sections.filter((s) => s !== value)
      : [...REPORT_SECTIONS.map((s) => s.value)].filter(
          (s) => sections.includes(s) || s === value,
        );
    update({ secoes: next.join(",") });
  };

  const monthOptions = availableMonths.length ? availableMonths : [month];

  return (
    <div className="mb-6 rounded-lg bg-white p-5 shadow-sm print:hidden">
      <h2 className="mb-1 font-bold text-navy">Gerar relatório</h2>
      <p className="mb-4 text-xs text-[#94A0BD]">
        Escolha o mês e a plataforma. O relatório é montado com os documentos já importados.
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[#94A0BD]">
            Mês
          </span>
          <select
            value={month}
            onChange={(e) => update({ mes: e.target.value })}
            className={SELECT_CLASS}
          >
            {monthOptions.map((m) => {
              const [y, mm] = m.split("-").map(Number);
              return (
                <option key={m} value={m}>
                  {MONTHS[mm - 1]} de {y}
                </option>
              );
            })}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[#94A0BD]">
            Plataforma
          </span>
          <select
            value={marketplace}
            onChange={(e) => update({ plataforma: e.target.value })}
            className={SELECT_CLASS}
          >
            <option value="all">Todas as plataformas</option>
            {clientMarketplaces.map((m) => (
              <option key={m} value={m}>
                {MARKETPLACE_LABEL[m] ?? m}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[#94A0BD]">
            Seções
          </span>
          <div className="flex flex-wrap gap-1.5">
            {REPORT_SECTIONS.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => toggleSection(s.value)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  sections.includes(s.value)
                    ? "bg-navy text-white"
                    : "border border-navy/10 text-[#5B647E] hover:bg-brand-gray"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="ml-auto flex gap-2">
          {generated && (
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-2 rounded-lg border border-navy/10 px-4 py-2 text-sm font-semibold text-navy transition-colors hover:bg-brand-gray"
            >
              <Printer className="h-4 w-4" />
              Imprimir / PDF
            </button>
          )}
          <button
            type="button"
            onClick={() => update({})}
            className="flex items-center gap-2 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0d1a38]"
          >
            <FileText className="h-4 w-4" />
            {generated ? "Atualizar relatório" : "Gerar relatório"}
          </button>
        </div>
      </div>
    </div>
  );
}
