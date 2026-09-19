"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Download, FileSpreadsheet, Trash2, Upload } from "lucide-react";
import type { SalesReport } from "@/lib/types";
import { MARKETPLACE_LABEL } from "@/lib/marketplaces";
import { createClient } from "@/lib/supabase/client";
import {
  deleteSalesReport,
  getSalesReportUrl,
  registerSalesReport,
} from "@/app/(dashboard)/clientes/[id]/vendas/actions";

const STATUS_LABEL: Record<SalesReport["status"], string> = {
  recebido: "Recebido",
  processado: "Processado",
  erro: "Erro",
};

const STATUS_BADGE: Record<SalesReport["status"], string> = {
  recebido: "bg-brand-gray text-navy",
  processado: "bg-green-100 text-green-700",
  erro: "bg-red-50 text-red-700",
};

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("pt-BR");
}

export function SalesReportsCard({
  clientId,
  clientMarketplaces,
  reports,
}: {
  clientId: string;
  clientMarketplaces: string[];
  reports: SalesReport[];
}) {
  const [marketplace, setMarketplace] = useState<string>(clientMarketplaces[0] ?? "mercado_livre");
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visible = reports.filter((r) => r.marketplace === marketplace);

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const supabase = createClient();
    const path = `sales-reports/${clientId}/${marketplace}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;

    const { error: uploadError } = await supabase.storage.from("client-files").upload(path, file);

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const result = await registerSalesReport({
      clientId,
      marketplace,
      name: file.name,
      path,
      size: file.size,
    });

    if (result && "error" in result) setError(result.error);
    if (inputRef.current) inputRef.current.value = "";
    setUploading(false);
  }

  async function handleDownload(path: string) {
    const url = await getSalesReportUrl(path);
    if (url) window.open(url, "_blank", "noopener");
    else setError("Não consegui gerar o link do arquivo.");
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <h2 className="mb-1 font-bold text-navy">Documentos de vendas por marketplace</h2>
      <p className="mb-4 text-xs text-[#94A0BD]">
        Envie aqui o relatório baixado de cada marketplace (pedidos, pagamentos, cancelamentos e
        devoluções). A leitura automática dessas informações ainda não está pronta — assim que
        tivermos um modelo do arquivo, os dados enviados aqui passam a alimentar as vendas
        automaticamente.
      </p>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {clientMarketplaces.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMarketplace(m)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              marketplace === m
                ? "bg-navy text-white"
                : "border border-navy/10 text-[#5B647E] hover:bg-brand-gray"
            }`}
          >
            {MARKETPLACE_LABEL[m] ?? m}
          </button>
        ))}
      </div>

      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-navy/20 py-4 text-sm font-semibold text-[#5B647E] transition-colors hover:border-blue hover:text-blue">
        <Upload className="h-4 w-4" />
        {uploading ? "Enviando..." : `Enviar documento — ${MARKETPLACE_LABEL[marketplace] ?? marketplace}`}
        <input
          ref={inputRef}
          type="file"
          onChange={handleUpload}
          disabled={uploading}
          className="sr-only"
        />
      </label>

      {error && <p className="mt-3 rounded bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

      {visible.length > 0 ? (
        <ul className="mt-4 divide-y divide-navy/[.06]">
          {visible.map((report) => (
            <li key={report.id} className="group flex items-center gap-3 py-2.5">
              <FileSpreadsheet className="h-4 w-4 flex-shrink-0 text-[#94A0BD]" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-navy" title={report.name}>
                  {report.name}
                </p>
                <p className="text-xs text-[#94A0BD]">
                  {formatDate(report.created_at)} · {formatSize(report.size)}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE[report.status]}`}
              >
                {STATUS_LABEL[report.status]}
              </span>
              <button
                type="button"
                onClick={() => handleDownload(report.path)}
                aria-label={`Baixar ${report.name}`}
                className="rounded p-1.5 text-[#94A0BD] transition-colors hover:bg-brand-gray hover:text-navy"
              >
                <Download className="h-4 w-4" />
              </button>
              <form action={deleteSalesReport}>
                <input type="hidden" name="id" value={report.id} />
                <input type="hidden" name="path" value={report.path} />
                <input type="hidden" name="client_id" value={clientId} />
                <button
                  type="submit"
                  aria-label={`Excluir ${report.name}`}
                  className="rounded p-1.5 text-[#94A0BD] opacity-0 transition-all hover:bg-red-50 hover:text-red-600 focus:opacity-100 group-hover:opacity-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-[#94A0BD]">
          Nenhum documento enviado ainda para {MARKETPLACE_LABEL[marketplace] ?? marketplace}.
        </p>
      )}
    </div>
  );
}
