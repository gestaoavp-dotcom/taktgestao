"use client";

import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { Download, FileSpreadsheet, RefreshCw, Trash2, Upload } from "lucide-react";
import type { SalesReport } from "@/lib/types";
import { MARKETPLACE_LABEL } from "@/lib/marketplaces";
import { createClient } from "@/lib/supabase/client";
import { parseShopeeOrders } from "@/lib/parsers/shopee-orders";
import {
  deleteSalesReport,
  deleteSalesReportById,
  getSalesReportUrl,
  importSalesOrders,
  markSalesReportError,
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

const PARSERS: Record<string, (rows: Record<string, unknown>[]) => ReturnType<typeof parseShopeeOrders>> = {
  shopee: parseShopeeOrders,
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

function monthLabel(reportMonth: string | null) {
  if (!reportMonth) return "Sem mês definido";
  const [y, m] = reportMonth.split("-").map(Number);
  return `${MONTHS[m - 1]} de ${y}`;
}

export function SalesReportsCard({
  clientId,
  clientMarketplaces,
  reports,
  orderCounts,
}: {
  clientId: string;
  clientMarketplaces: string[];
  reports: SalesReport[];
  orderCounts: Record<string, number>;
}) {
  const now = new Date();
  const [marketplace, setMarketplace] = useState<string>(clientMarketplaces[0] ?? "mercado_livre");
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const inputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visible = reports.filter((r) => r.marketplace === marketplace);

  const grouped = useMemo(() => {
    const byMonth = new Map<string, SalesReport[]>();
    for (const r of visible) {
      const key = r.report_month ?? "sem-mes";
      const list = byMonth.get(key) ?? [];
      list.push(r);
      byMonth.set(key, list);
    }
    return Array.from(byMonth.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [visible]);

  async function runUpload(file: File, replaceReport?: SalesReport) {
    setUploading(true);
    setError(null);

    const reportMarketplace = replaceReport?.marketplace ?? marketplace;
    const reportMonth = replaceReport?.report_month ?? `${year}-${String(month).padStart(2, "0")}-01`;

    const supabase = createClient();
    const path = `sales-reports/${clientId}/${reportMarketplace}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;

    const { error: uploadError } = await supabase.storage.from("client-files").upload(path, file);
    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    if (replaceReport) {
      await deleteSalesReportById({ id: replaceReport.id, clientId, path: replaceReport.path });
    }

    const registered = await registerSalesReport({
      clientId,
      marketplace: reportMarketplace,
      reportMonth,
      name: file.name,
      path,
      size: file.size,
    });

    if ("error" in registered) {
      setError(registered.error);
      setUploading(false);
      return;
    }

    const parser = PARSERS[reportMarketplace];
    if (parser) {
      try {
        const XLSX = await import("xlsx");
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
        const orders = parser(rows);

        const result = await importSalesOrders({
          clientId,
          reportId: registered.id,
          marketplace: reportMarketplace,
          reportMonth,
          orders,
        });
        if (result && "error" in result) setError(result.error);
      } catch {
        await markSalesReportError(registered.id, clientId);
        setError("Não consegui ler o conteúdo do arquivo. Ele foi salvo, mas sem os pedidos.");
      }
    }

    setUploading(false);
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    await runUpload(file);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleReplace(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    const report = reports.find((r) => r.id === replacingId);
    if (!file || !report) return;
    await runUpload(file, report);
    if (replaceInputRef.current) replaceInputRef.current.value = "";
    setReplacingId(null);
  }

  async function handleDownload(path: string) {
    const url = await getSalesReportUrl(path);
    if (url) window.open(url, "_blank", "noopener");
    else setError("Não consegui gerar o link do arquivo.");
  }

  const hasParser = Boolean(PARSERS[marketplace]);

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <h2 className="mb-1 font-bold text-navy">Documentos de vendas por marketplace</h2>
      <p className="mb-4 text-xs text-[#94A0BD]">
        Envie aqui o relatório baixado de cada marketplace (pedidos, pagamentos, cancelamentos e
        devoluções).
        {hasParser
          ? " Os pedidos são lidos automaticamente e aparecem na aba Pedidos."
          : " A leitura automática desse marketplace ainda não está pronta — o arquivo fica salvo, mas os pedidos não são extraídos ainda."}
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

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="rounded-lg border border-navy/10 bg-white px-3 py-2 text-sm text-navy outline-none focus:border-blue"
        >
          {MONTHS.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="rounded-lg border border-navy/10 bg-white px-3 py-2 text-sm text-navy outline-none focus:border-blue"
        >
          {Array.from({ length: 4 }, (_, i) => now.getFullYear() - 2 + i).map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-navy/20 py-2.5 text-sm font-semibold text-[#5B647E] transition-colors hover:border-blue hover:text-blue">
          <Upload className="h-4 w-4" />
          {uploading && !replacingId ? "Enviando..." : "Enviar documento deste mês"}
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleUpload}
            disabled={uploading}
            className="sr-only"
          />
        </label>
      </div>

      <input
        ref={replaceInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleReplace}
        className="sr-only"
      />

      {error && <p className="mb-3 rounded bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

      {grouped.length > 0 ? (
        <div className="divide-y divide-navy/[.06]">
          {grouped.map(([monthKey, monthReports]) => (
            <div key={monthKey} className="py-3">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#94A0BD]">
                {monthLabel(monthReports[0].report_month)}
              </p>
              <ul className="flex flex-col gap-2">
                {monthReports.map((report) => (
                  <li
                    key={report.id}
                    className="group flex items-center gap-3 rounded-lg bg-brand-gray/40 px-3 py-2"
                  >
                    <FileSpreadsheet className="h-4 w-4 flex-shrink-0 text-[#94A0BD]" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-navy" title={report.name}>
                        {report.name}
                      </p>
                      <p className="text-xs text-[#94A0BD]">
                        {formatDate(report.created_at)} · {formatSize(report.size)}
                        {orderCounts[report.id] ? ` · ${orderCounts[report.id]} pedidos` : ""}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE[report.status]}`}
                    >
                      {STATUS_LABEL[report.status]}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setReplacingId(report.id);
                        replaceInputRef.current?.click();
                      }}
                      disabled={uploading}
                      aria-label={`Substituir ${report.name}`}
                      title="Substituir arquivo"
                      className="rounded p-1.5 text-[#94A0BD] transition-colors hover:bg-white hover:text-navy disabled:opacity-40"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownload(report.path)}
                      aria-label={`Baixar ${report.name}`}
                      className="rounded p-1.5 text-[#94A0BD] transition-colors hover:bg-white hover:text-navy"
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
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-[#94A0BD]">
          Nenhum documento enviado ainda para {MARKETPLACE_LABEL[marketplace] ?? marketplace}.
        </p>
      )}
    </div>
  );
}
