"use client";

import { useState, type ChangeEvent } from "react";
import type { Client } from "@/lib/types";
import { MARKETPLACES } from "@/lib/marketplaces";
import { importSalesDaily } from "@/app/(dashboard)/vendas/actions";

const DATE_KEYWORDS = ["data", "date"];
const REVENUE_KEYWORDS = ["valor", "total", "receita", "revenue", "price", "faturamento"];
const ORDER_KEYWORDS = ["pedido", "order", "id"];

function guessColumn(headers: string[], keywords: string[]) {
  const lower = headers.map((h) => h.toLowerCase());
  for (const keyword of keywords) {
    const idx = lower.findIndex((h) => h.includes(keyword));
    if (idx !== -1) return headers[idx];
  }
  return headers[0] ?? "";
}

function parseNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (!value) return 0;
  let str = String(value).trim();
  if (str.includes(",") && str.includes(".")) {
    str = str.replace(/\./g, "").replace(",", ".");
  } else if (str.includes(",")) {
    str = str.replace(",", ".");
  }
  const n = parseFloat(str.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function parseDate(value: unknown): string | null {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "number") {
    const ms = (value - 25569) * 86400 * 1000;
    const d = new Date(ms);
    return Number.isFinite(d.getTime()) ? d.toISOString().slice(0, 10) : null;
  }
  const str = String(value).trim();
  const brMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (brMatch) {
    const [, d, m, y] = brMatch;
    const year = y.length === 2 ? `20${y}` : y;
    return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const d = new Date(str);
  return Number.isFinite(d.getTime()) ? d.toISOString().slice(0, 10) : null;
}

export function SalesImportForm({ clients }: { clients: Client[] }) {
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [platform, setPlatform] = useState<string>(MARKETPLACES[0].value);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [dateCol, setDateCol] = useState("");
  const [revenueCol, setRevenueCol] = useState("");
  const [orderCol, setOrderCol] = useState("__count_rows__");
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setStatus(null);

    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const parsed = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

    if (!parsed.length) {
      setStatus("Não encontrei linhas nesse arquivo.");
      return;
    }

    const detectedHeaders = Object.keys(parsed[0]);
    setHeaders(detectedHeaders);
    setRows(parsed);
    setDateCol(guessColumn(detectedHeaders, DATE_KEYWORDS));
    setRevenueCol(guessColumn(detectedHeaders, REVENUE_KEYWORDS));
    setOrderCol(guessColumn(detectedHeaders, ORDER_KEYWORDS) || "__count_rows__");
  }

  function buildAggregatedRows() {
    const byDate = new Map<string, { revenue: number; orderKeys: Set<string>; rowCount: number }>();

    for (const row of rows) {
      const date = parseDate(row[dateCol]);
      if (!date) continue;

      const entry = byDate.get(date) ?? { revenue: 0, orderKeys: new Set<string>(), rowCount: 0 };
      entry.revenue += parseNumber(row[revenueCol]);
      entry.rowCount += 1;
      if (orderCol !== "__count_rows__") {
        entry.orderKeys.add(String(row[orderCol]));
      }
      byDate.set(date, entry);
    }

    return Array.from(byDate.entries())
      .map(([date, v]) => ({
        date,
        revenue: Math.round(v.revenue * 100) / 100,
        orders: orderCol === "__count_rows__" ? v.rowCount : v.orderKeys.size,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  const aggregated = rows.length && dateCol && revenueCol ? buildAggregatedRows() : [];

  async function handleImport() {
    if (!clientId || !aggregated.length) return;
    setImporting(true);
    setStatus(null);

    const result = await importSalesDaily({ clientId, platform, rows: aggregated });

    setImporting(false);
    if (result.error) {
      setStatus(`Erro: ${result.error}`);
    } else {
      setStatus(`Importado: ${result.count} dia(s) de vendas.`);
      setRows([]);
      setHeaders([]);
      setFileName("");
    }
  }

  return (
    <div className="rounded-lg bg-white p-4 shadow-sm">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-navy">Cliente</label>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="rounded border border-navy/10 bg-transparent px-3 py-2 text-sm text-navy outline-none focus:border-blue"
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-navy">Plataforma</label>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="rounded border border-navy/10 bg-transparent px-3 py-2 text-sm text-navy outline-none focus:border-blue"
          >
            {MARKETPLACES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-1.5">
        <label className="text-sm font-medium text-navy">
          Arquivo exportado da plataforma (.xlsx, .xls ou .csv)
        </label>
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFile}
          className="rounded border border-navy/10 bg-transparent px-3 py-2 text-sm text-navy outline-none file:mr-3 file:rounded file:border-0 file:bg-brand-gray file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-navy"
        />
        {fileName && <p className="text-xs text-[#94A0BD]">{fileName}</p>}
      </div>

      {headers.length > 0 && (
        <>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-navy">Coluna de data</label>
              <select
                value={dateCol}
                onChange={(e) => setDateCol(e.target.value)}
                className="rounded border border-navy/10 bg-transparent px-2 py-1.5 text-sm text-navy outline-none focus:border-blue"
              >
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-navy">Coluna de valor</label>
              <select
                value={revenueCol}
                onChange={(e) => setRevenueCol(e.target.value)}
                className="rounded border border-navy/10 bg-transparent px-2 py-1.5 text-sm text-navy outline-none focus:border-blue"
              >
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-navy">Coluna de pedido</label>
              <select
                value={orderCol}
                onChange={(e) => setOrderCol(e.target.value)}
                className="rounded border border-navy/10 bg-transparent px-2 py-1.5 text-sm text-navy outline-none focus:border-blue"
              >
                <option value="__count_rows__">Contar linhas</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded border border-navy/10">
            <table className="w-full text-left text-xs">
              <thead className="bg-brand-gray">
                <tr>
                  <th className="px-3 py-1.5 font-medium text-navy">Dia</th>
                  <th className="px-3 py-1.5 font-medium text-navy">Faturamento</th>
                  <th className="px-3 py-1.5 font-medium text-navy">Pedidos</th>
                </tr>
              </thead>
              <tbody>
                {aggregated.slice(0, 6).map((r) => (
                  <tr key={r.date} className="border-t border-navy/[.06]">
                    <td className="px-3 py-1.5 text-navy">{r.date}</td>
                    <td className="px-3 py-1.5 text-[#5B647E]">
                      {r.revenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </td>
                    <td className="px-3 py-1.5 text-[#5B647E]">{r.orders}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {aggregated.length > 6 && (
              <p className="bg-brand-gray px-3 py-1.5 text-xs text-[#94A0BD]">
                +{aggregated.length - 6} dia(s) a mais
              </p>
            )}
          </div>

          <button
            type="button"
            disabled={importing || !aggregated.length}
            onClick={handleImport}
            className="mt-4 h-10 rounded bg-navy px-4 text-sm font-medium text-white transition-colors hover:bg-[#0d1a38] disabled:opacity-50"
          >
            {importing ? "Importando..." : `Importar ${aggregated.length} dia(s)`}
          </button>
        </>
      )}

      {status && <p className="mt-3 text-sm text-navy">{status}</p>}
    </div>
  );
}
