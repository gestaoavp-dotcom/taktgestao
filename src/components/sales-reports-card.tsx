"use client";

import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { Download, FileSpreadsheet, RefreshCw, Trash2, Upload } from "lucide-react";
import type { ClientAccount, SalesReport, SalesReportKind } from "@/lib/types";
import { MARKETPLACE_LABEL } from "@/lib/marketplaces";
import { createClient } from "@/lib/supabase/client";
import { parseShopeeOrders } from "@/lib/parsers/shopee-orders";
import { parseShopeeAds, stripAdsPreamble } from "@/lib/parsers/shopee-ads";
import { parseShopeeTraffic } from "@/lib/parsers/shopee-traffic";
import {
  findMercadoLivreHeaderRow,
  parseMercadoLivreOrders,
} from "@/lib/parsers/mercado-livre-orders";
import { parseAmazonProducts } from "@/lib/parsers/amazon-products";
import {
  MERCADO_LIVRE_ADS_SHEET,
  parseMercadoLivreAds,
} from "@/lib/parsers/mercado-livre-ads";
import {
  deleteSalesReport,
  deleteSalesReportById,
  getSalesReportUrl,
  importSalesAds,
  importSalesProducts,
  importSalesTraffic,
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

const KINDS: { value: SalesReportKind; label: string; hint: string }[] = [
  {
    value: "pedidos",
    label: "Pedidos",
    hint: "relatório de pedidos: valores, pagamentos, cancelamentos e devoluções",
  },
  { value: "trafego", label: "Tráfego", hint: "visitas, visualizações e conversão das páginas" },
  { value: "ads", label: "Ads", hint: "campanhas: investimento, cliques e vendas por anúncio" },
  {
    value: "produtos",
    label: "Produtos",
    hint: "relatório de negócios: resultado do mês por produto, com tarifas e logística",
  },
];

/**
 * Orders per request when sending a parsed report to the server.
 *
 * A Server Action refuses a body over 1 MB, and a Mercado Livre order carries
 * its whole 66-column row: a thousand of them is about 3 MB. Sent in one go it
 * failed as "could not read the file", which was true of nothing.
 */
const ORDERS_PER_BATCH = 150;

/**
 * Refuses a report whose sales fall outside the window chosen for it.
 *
 * Getting this wrong is not a cosmetic mistake: the import replaces the window
 * it was told it covers, so a August file filed under September deletes nothing
 * and lands on top of the August orders already there. That doubled a client's
 * revenue before this check existed.
 */
function periodMismatch(
  dates: (string | null)[],
  start: string,
  end: string,
): string | null {
  const known = dates.filter((d): d is string => !!d).sort();
  if (!known.length) return null;

  const first = known[0];
  const last = known[known.length - 1];
  if (first >= start && last <= end) return null;

  return (
    `As vendas desse arquivo vão de ${formatShort(first)} a ${formatShort(last)}, ` +
    `fora do período ${formatShort(start)} a ${formatShort(end)} que você escolheu. ` +
    "Ajuste as datas e envie de novo — importar assim duplicaria os pedidos."
  );
}

/** "24/09" — enough to read a window at a glance. */
function formatShort(iso: string) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

function toISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Today's sales are still arriving, so a weekly upload ends yesterday. */
function yesterday(d: Date) {
  const y = new Date(d);
  y.setDate(y.getDate() - 1);
  return y;
}

/** Unique per upload, so replacing a file never collides with the old one. */
function storagePath(clientId: string, marketplace: string, name: string) {
  return `sales-reports/${clientId}/${marketplace}/${Date.now()}-${name.replace(/[^\w.\-]/g, "_")}`;
}

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

/** Marketplaces whose report we know how to read, per kind of report. */
const READABLE: Record<SalesReportKind, string[]> = {
  pedidos: ["shopee", "mercado_livre"],
  produtos: ["amazon"],
  ads: ["shopee", "mercado_livre"],
  trafego: ["shopee"],
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
  accounts,
  reports,
  orderCounts,
}: {
  clientId: string;
  accounts: ClientAccount[];
  reports: SalesReport[];
  orderCounts: Record<string, number>;
}) {
  const now = new Date();
  const [kind, setKind] = useState<SalesReportKind>("pedidos");
  const clientMarketplaces = useMemo(
    () => [...new Set(accounts.map((a) => a.marketplace))],
    [accounts],
  );
  const [marketplace, setMarketplace] = useState<string>(
    accounts[0]?.marketplace ?? "mercado_livre",
  );
  const [accountId, setAccountId] = useState<string>("");
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  // Orders carry a date per sale, so they can be uploaded for any window. The
  // other reports settle a whole month and have no day in them.
  const [from, setFrom] = useState(() => toISODate(startOfMonth(now)));
  const [to, setTo] = useState(() => toISODate(yesterday(now)));
  const inputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A client can sell on the same marketplace under more than one store, and
  // each exports its own file. Asking which only makes sense when there are two.
  const stores = accounts.filter((a) => a.marketplace === marketplace);
  const store = stores.find((a) => a.id === accountId) ?? (stores.length === 1 ? stores[0] : null);

  // Reports uploaded before the kind column existed are order reports.
  const visible = reports.filter(
    (r) => r.marketplace === marketplace && (r.kind ?? "pedidos") === kind,
  );

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

    const reportKind = replaceReport?.kind ?? kind;
    const reportMarketplace = replaceReport?.marketplace ?? marketplace;
    const byPeriod = reportKind === "pedidos";
    const reportMonth =
      replaceReport?.report_month ??
      (byPeriod ? `${from.slice(0, 7)}-01` : `${year}-${String(month).padStart(2, "0")}-01`);
    const periodStart = byPeriod ? (replaceReport?.period_start ?? from) : reportMonth;
    const periodEnd = byPeriod ? (replaceReport?.period_end ?? to) : null;
    const reportAccountId = replaceReport?.account_id ?? store?.id ?? null;

    const supabase = createClient();
    const path = storagePath(clientId, reportMarketplace, file.name);

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
      kind: reportKind,
      marketplace: reportMarketplace,
      accountId: reportAccountId,
      reportMonth,
      periodStart,
      periodEnd,
      name: file.name,
      path,
      size: file.size,
    });

    if ("error" in registered) {
      setError(registered.error);
      setUploading(false);
      return;
    }

    if (READABLE[reportKind].includes(reportMarketplace)) {
      try {
        const XLSX = await import("xlsx");

        if (reportKind === "ads" && reportMarketplace === "mercado_livre") {
          // Its figures live on a named sheet, behind two of help text, and the
          // headers carry line breaks — so the rows come back raw.
          const buffer = await file.arrayBuffer();
          const workbook = XLSX.read(buffer, { type: "array" });
          const sheet = workbook.Sheets[MERCADO_LIVRE_ADS_SHEET];
          if (!sheet) {
            await markSalesReportError(registered.id, clientId);
            setError(
              `Esse arquivo não tem a aba "${MERCADO_LIVRE_ADS_SHEET}". Exporte o relatório de campanhas em Publicidade.`,
            );
            setUploading(false);
            return;
          }
          const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
            header: 1,
            blankrows: false,
          });

          const result = await importSalesAds({
            clientId,
            reportId: registered.id,
            marketplace: reportMarketplace,
            accountId: reportAccountId,
            reportMonth,
            ads: parseMercadoLivreAds(rows),
          });
          if (result && "error" in result) setError(result.error);
        } else if (reportKind === "ads") {
          // The ads export is a CSV with a preamble, and its day-first dates
          // must not be reinterpreted, hence raw.
          const text = stripAdsPreamble(await file.text());
          const workbook = XLSX.read(text, { type: "string", raw: true });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { raw: true });

          const result = await importSalesAds({
            clientId,
            reportId: registered.id,
            marketplace: reportMarketplace,
            accountId: reportAccountId,
            reportMonth,
            ads: parseShopeeAds(rows),
          });
          if (result && "error" in result) setError(result.error);
        } else if (reportKind === "trafego") {
          // Figures are Brazilian-formatted text, so keep the cells raw.
          const buffer = await file.arrayBuffer();
          const workbook = XLSX.read(buffer, { type: "array", raw: true });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { raw: true });

          const result = await importSalesTraffic({
            clientId,
            reportId: registered.id,
            marketplace: reportMarketplace,
            accountId: reportAccountId,
            reportMonth,
            products: parseShopeeTraffic(rows),
          });
          if (result && "error" in result) setError(result.error);
        } else if (reportKind === "produtos") {
          // Two rows of headers that must be read together, so the sheet comes
          // back as raw rows rather than objects.
          const buffer = await file.arrayBuffer();
          const workbook = XLSX.read(buffer, { type: "array" });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
            header: 1,
            blankrows: false,
          });

          const result = await importSalesProducts({
            clientId,
            reportId: registered.id,
            marketplace: reportMarketplace,
            accountId: reportAccountId,
            reportMonth,
            products: parseAmazonProducts(rows),
          });
          if (result && "error" in result) setError(result.error);
        } else if (reportMarketplace === "mercado_livre") {
          // The header is where it actually is, not where it usually is: the
          // preamble is a different height from one export to the next.
          const buffer = await file.arrayBuffer();
          const workbook = XLSX.read(buffer, { type: "array" });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const headerRow = findMercadoLivreHeaderRow(
            XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: true }),
          );
          const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
            range: headerRow,
          });

          const orders = parseMercadoLivreOrders(rows);

          const mismatch = periodEnd
            ? periodMismatch(orders.map((o) => o.created_on), periodStart, periodEnd)
            : null;
          if (mismatch) {
            await markSalesReportError(registered.id, clientId);
            setError(mismatch);
            setUploading(false);
            return;
          }

          for (let i = 0; i < orders.length; i += ORDERS_PER_BATCH) {
            const batch = orders.slice(i, i + ORDERS_PER_BATCH);
            const last = i + ORDERS_PER_BATCH >= orders.length;

            const result = await importSalesOrders({
              clientId,
              reportId: registered.id,
              marketplace: reportMarketplace,
              accountId: reportAccountId,
              reportMonth,
              orders: batch,
              replace: i === 0 && periodEnd ? { start: periodStart, end: periodEnd } : null,
              finalize: last,
            });
            if (result && "error" in result) {
              setError(result.error);
              break;
            }
          }
        } else {
          const buffer = await file.arrayBuffer();
          const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

          const orders = parseShopeeOrders(rows);

          const mismatch = periodEnd
            ? periodMismatch(orders.map((o) => o.created_on), periodStart, periodEnd)
            : null;
          if (mismatch) {
            await markSalesReportError(registered.id, clientId);
            setError(mismatch);
            setUploading(false);
            return;
          }

          for (let i = 0; i < orders.length; i += ORDERS_PER_BATCH) {
            const batch = orders.slice(i, i + ORDERS_PER_BATCH);
            const last = i + ORDERS_PER_BATCH >= orders.length;

            const result = await importSalesOrders({
              clientId,
              reportId: registered.id,
              marketplace: reportMarketplace,
              accountId: reportAccountId,
              reportMonth,
              orders: batch,
              replace: i === 0 && periodEnd ? { start: periodStart, end: periodEnd } : null,
              finalize: last,
            });
            if (result && "error" in result) {
              setError(result.error);
              break;
            }
          }
        }
      } catch (e) {
        await markSalesReportError(registered.id, clientId);
        setError(
          `${(e as Error).message || "Não consegui ler o conteúdo do arquivo."} ` +
            "O arquivo ficou salvo, mas sem os dados — use o botão de substituir para tentar de novo.",
        );
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

  const hasParser = READABLE[kind].includes(marketplace);

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <h2 className="mb-3 font-bold text-navy">Importar documentos</h2>

      <nav className="mb-3 flex gap-1 border-b border-navy/[.08]">
        {KINDS.map((k) => (
          <button
            key={k.value}
            type="button"
            onClick={() => setKind(k.value)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
              kind === k.value
                ? "border-blue text-blue"
                : "border-transparent text-[#5B647E] hover:text-navy"
            }`}
          >
            {k.label}
          </button>
        ))}
      </nav>

      <p className="mb-4 text-xs text-[#94A0BD]">
        {KINDS.find((k) => k.value === kind)?.hint}
        {hasParser
          ? ` — os dados são lidos automaticamente e aparecem na aba ${kind === "ads" ? "Ads" : kind === "trafego" ? "Tráfego" : "Pedidos"}.`
          : " — a leitura automática desse tipo ainda não está pronta: o arquivo fica salvo, mas os dados não são extraídos."}
      </p>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {clientMarketplaces.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMarketplace(m);
              setAccountId("");
            }}
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

      {stores.length > 1 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[#94A0BD]">
            Loja
          </span>
          {stores.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setAccountId(a.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                accountId === a.id
                  ? "bg-blue text-white"
                  : "border border-navy/10 text-[#5B647E] hover:bg-brand-gray"
              }`}
            >
              {a.store_name}
            </button>
          ))}
          {!accountId && (
            <span className="text-[11px] text-[#c2410c]">
              escolha de qual loja é esse arquivo
            </span>
          )}
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {kind === "pedidos" ? (
          <>
            <label className="flex items-center gap-1.5 text-sm text-[#5B647E]">
              De
              <input
                type="date"
                value={from}
                max={to}
                onChange={(e) => setFrom(e.target.value)}
                className="rounded-lg border border-navy/10 bg-white px-3 py-2 text-sm text-navy outline-none focus:border-blue"
              />
            </label>
            <label className="flex items-center gap-1.5 text-sm text-[#5B647E]">
              até
              <input
                type="date"
                value={to}
                min={from}
                onChange={(e) => setTo(e.target.value)}
                className="rounded-lg border border-navy/10 bg-white px-3 py-2 text-sm text-navy outline-none focus:border-blue"
              />
            </label>
          </>
        ) : (
          <>
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
          </>
        )}

        <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-navy/20 py-2.5 text-sm font-semibold text-[#5B647E] transition-colors hover:border-blue hover:text-blue">
          <Upload className="h-4 w-4" />
          {uploading && !replacingId
            ? "Enviando..."
            : kind === "pedidos"
              ? "Enviar documento de pedidos deste período"
              : `Enviar documento de ${KINDS.find((k) => k.value === kind)?.label.toLowerCase()} deste mês`}
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
                        {report.period_start && report.period_end
                          ? ` · ${formatShort(report.period_start)} a ${formatShort(report.period_end)}`
                          : ""}
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
          Nenhum documento de {KINDS.find((k) => k.value === kind)?.label.toLowerCase()} enviado
          ainda para {MARKETPLACE_LABEL[marketplace] ?? marketplace}.
        </p>
      )}
    </div>
  );
}
