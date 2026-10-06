"use client";

import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { Download, FileSpreadsheet, RefreshCw, Trash2, Upload } from "lucide-react";
import type { ClientAccount, SalesReport, SalesReportKind } from "@/lib/types";
import { MARKETPLACE_LABEL } from "@/lib/marketplaces";
import { DateField } from "@/components/date-field";
import { createClient } from "@/lib/supabase/client";
import { parseShopeeOrders } from "@/lib/parsers/shopee-orders";
import { isAmazonOrdersText, parseAmazonOrders } from "@/lib/parsers/amazon-orders";
import { parseShopeeAds, stripAdsPreamble } from "@/lib/parsers/shopee-ads";
import { parseShopeeTraffic } from "@/lib/parsers/shopee-traffic";
import {
  findMercadoLivreHeaderRow,
  parseMercadoLivreOrders,
} from "@/lib/parsers/mercado-livre-orders";
import { parseAmazonProducts } from "@/lib/parsers/amazon-products";
import { parseSheinOrders } from "@/lib/parsers/shein-orders";
import { parseTikTokOrders } from "@/lib/parsers/tiktok-orders";
import {
  describeMercadoLivreAdsFile,
  findMercadoLivreAdsSheet,
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
  recebido: "bg-panel-2 text-ink",
  processado: "bg-pos/15 text-pos",
  erro: "bg-danger/10 text-danger",
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
  const undated = dates.length - dates.filter(Boolean).length;
  if (undated) {
    return (
      `${undated} venda${undated === 1 ? "" : "s"} desse arquivo sem data de venda — ` +
      "sem ela nenhum gráfico as contaria. O formato do relatório pode ter mudado: avise a equipe."
    );
  }

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

/**
 * Amazon exports two reports: the orders, as a tab-separated .txt, and the
 * sales by product, as a spreadsheet. Each is read as what it is, whichever
 * tab it was sent from — the spreadsheet sent as Pedidos used to be kept and
 * never read.
 */
function readKind(kind: SalesReportKind, marketplace: string, fileName?: string): SalesReportKind {
  if (marketplace !== "amazon" || (kind !== "pedidos" && kind !== "produtos")) return kind;
  if (fileName) return /\.txt$/i.test(fileName) ? "pedidos" : "produtos";
  return kind;
}

/** Amazon's two reports are listed together: either tab may have sent them. */
function listedUnder(reportKind: SalesReportKind, kind: SalesReportKind, marketplace: string) {
  if (marketplace === "amazon" && kind !== "ads" && kind !== "trafego") {
    return reportKind === "pedidos" || reportKind === "produtos";
  }
  return reportKind === kind;
}

/** Marketplaces whose report we know how to read, per kind of report. */
const READABLE: Record<SalesReportKind, string[]> = {
  pedidos: ["shopee", "mercado_livre", "shein", "tiktok", "amazon"],
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
    (r) =>
      r.marketplace === marketplace &&
      listedUnder(r.kind ?? "pedidos", kind, marketplace),
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

    const reportMarketplace = replaceReport?.marketplace ?? marketplace;
    const reportKind = readKind(replaceReport?.kind ?? kind, reportMarketplace, file.name);
    // Orders carry a date per sale; Amazon's product report carries none, but
    // covers whatever window it was exported for — one month or, on a first
    // import, several.
    const byPeriod = reportKind === "pedidos" || reportKind === "produtos";
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
          const sheetName = findMercadoLivreAdsSheet(workbook.SheetNames);
          const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
          if (!sheet) {
            await markSalesReportError(registered.id, clientId);
            const sent = describeMercadoLivreAdsFile(workbook.SheetNames);
            setError(
              sent
                ? `Esse é ${sent}: ele traz as vendas e a receita, mas não o investimento, os cliques nem as impressões — que é o que a aba Ads mostra. Em Publicidade, baixe o relatório de campanhas.`
                : "Esse arquivo não tem a aba de campanhas. Em Publicidade, baixe o relatório de campanhas.",
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
        } else if (reportMarketplace === "tiktok") {
          // A CSV whose amounts carry their currency, so the cells stay raw.
          const text = await file.text();
          const workbook = XLSX.read(text, { type: "string", raw: true });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const orders = parseTikTokOrders(
            XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false }),
          );

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
            const result = await importSalesOrders({
              clientId,
              reportId: registered.id,
              marketplace: reportMarketplace,
              accountId: reportAccountId,
              reportMonth,
              orders: orders.slice(i, i + ORDERS_PER_BATCH),
              replace: i === 0 && periodEnd ? { start: periodStart, end: periodEnd } : null,
              finalize: i + ORDERS_PER_BATCH >= orders.length,
            });
            if (result && "error" in result) {
              setError(result.error);
              break;
            }
          }
        } else if (reportMarketplace === "shein") {
          // Two header rows, the second holding the real names, so the sheet
          // comes back raw and the parser finds its own header.
          const buffer = await file.arrayBuffer();
          const workbook = XLSX.read(buffer, { type: "array" });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const orders = parseSheinOrders(
            XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false }),
          );

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
            const result = await importSalesOrders({
              clientId,
              reportId: registered.id,
              marketplace: reportMarketplace,
              accountId: reportAccountId,
              reportMonth,
              orders: orders.slice(i, i + ORDERS_PER_BATCH),
              replace: i === 0 && periodEnd ? { start: periodStart, end: periodEnd } : null,
              finalize: i + ORDERS_PER_BATCH >= orders.length,
            });
            if (result && "error" in result) {
              setError(result.error);
              break;
            }
          }
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
        } else if (reportMarketplace === "amazon") {
          // Tab-separated text, read as is: SheetJS would guess at the dates.
          const text = await file.text();
          if (!isAmazonOrdersText(text)) {
            await markSalesReportError(registered.id, clientId);
            setError(
              "Esse .txt não é o relatório de pedidos da Amazon. Em Seller Central, baixe " +
                "Relatórios → Atendimento/Pedidos → Todos os pedidos.",
            );
            setUploading(false);
            return;
          }
          const orders = parseAmazonOrders(text);

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
            const result = await importSalesOrders({
              clientId,
              reportId: registered.id,
              marketplace: reportMarketplace,
              accountId: reportAccountId,
              reportMonth,
              orders: orders.slice(i, i + ORDERS_PER_BATCH),
              replace: i === 0 && periodEnd ? { start: periodStart, end: periodEnd } : null,
              finalize: i + ORDERS_PER_BATCH >= orders.length,
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
    } else {
      // Said at the moment of upload: a file kept but never read looked like a
      // success, and its numbers were simply missing from every screen.
      setError(
        "O arquivo ficou salvo, mas a leitura automática desse tipo de relatório ainda não existe: " +
          "os números dele não aparecem nos gráficos.",
      );
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

  const effectiveKind = readKind(kind, marketplace);
  const hasParser = READABLE[effectiveKind].includes(marketplace);
  const byPeriod = effectiveKind === "pedidos" || effectiveKind === "produtos";
  const amazonSpansMonths =
    effectiveKind === "produtos" &&
    marketplace === "amazon" &&
    from.slice(0, 7) !== to.slice(0, 7);

  return (
    <div className="lift rounded-2xl bg-panel p-6 shadow-sm">
      <h2 className="mb-3 font-bold text-ink">Importar documentos</h2>

      <nav className="mb-3 flex gap-1 border-b border-line">
        {KINDS.map((k) => (
          <button
            key={k.value}
            type="button"
            onClick={() => setKind(k.value)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
              kind === k.value
                ? "border-accent text-accent-ink"
                : "border-transparent text-ink-2 hover:text-ink"
            }`}
          >
            {k.label}
          </button>
        ))}
      </nav>

      <p className="mb-4 text-xs text-ink-3">
        {KINDS.find((k) => k.value === kind)?.hint}
        {hasParser
          ? ` — os dados são lidos automaticamente e aparecem na aba ${effectiveKind === "ads" ? "Ads" : effectiveKind === "trafego" ? "Tráfego" : effectiveKind === "produtos" ? "Produtos" : "Pedidos"}.`
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
                ? "bg-action text-on-accent"
                : "border border-line text-ink-2 hover:bg-panel-2"
            }`}
          >
            {MARKETPLACE_LABEL[m] ?? m}
          </button>
        ))}
      </div>

      {stores.length > 1 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">
            Loja
          </span>
          {stores.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setAccountId(a.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                accountId === a.id
                  ? "bg-accent text-on-accent"
                  : "border border-line text-ink-2 hover:bg-panel-2"
              }`}
            >
              {a.store_name}
            </button>
          ))}
          {!accountId && (
            <span className="text-[11px] text-warn">
              escolha de qual loja é esse arquivo
            </span>
          )}
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {byPeriod ? (
          <>
            <span className="text-sm text-ink-2">De</span>
            <div className="w-36">
              <DateField
                key={`de-${from}`}
                name="periodo_de"
                defaultValue={from}
                max={to}
                onChange={(value) => value && setFrom(value)}
              />
            </div>
            <span className="text-sm text-ink-2">até</span>
            <div className="w-36">
              <DateField
                key={`ate-${to}`}
                name="periodo_ate"
                defaultValue={to}
                min={from}
                onChange={(value) => value && setTo(value)}
              />
            </div>
          </>
        ) : (
          <>
        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink outline-none focus:border-accent"
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
          className="rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink outline-none focus:border-accent"
        >
          {Array.from({ length: 4 }, (_, i) => now.getFullYear() - 2 + i).map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
          </>
        )}

        <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-line py-2.5 text-sm font-semibold text-ink-2 transition-colors hover:border-accent hover:text-accent-ink">
          <Upload className="h-4 w-4" />
          {uploading && !replacingId
            ? "Enviando..."
            : byPeriod
              ? `Enviar documento de ${effectiveKind === "produtos" ? "produtos" : "pedidos"} deste período`
              : `Enviar documento de ${KINDS.find((k) => k.value === kind)?.label.toLowerCase()} deste mês`}
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv,.txt"
            onChange={handleUpload}
            disabled={uploading}
            className="sr-only"
          />
        </label>
      </div>

      <input
        ref={replaceInputRef}
        type="file"
        accept=".xlsx,.xls,.csv,.txt"
        onChange={handleReplace}
        className="sr-only"
      />

      {/* What happens to a file holding more than one month — common on a
          client's first import — differs by report, so it is said up front. */}
      {marketplace === "amazon" && byPeriod && (
        <p className="mb-3 text-xs text-ink-3">
          Amazon: o relatório de pedidos (.txt, em Relatórios → Pedidos → Todos os pedidos) traz
          cada venda com a data — é o que alimenta o faturamento dia a dia e pode ter vários meses.
          A planilha de produtos traz as tarifas da Amazon, para a margem.
        </p>
      )}
      {amazonSpansMonths && (
        <p className="mb-3 rounded bg-gold/10 px-3 py-2 text-xs text-ink-2">
          Esse relatório da Amazon não separa as vendas por mês: com mais de um mês, ele só entra
          nos totais quando o período escolhido no Dashboard cobrir essas datas inteiras. Para ver
          mês a mês, envie um arquivo por mês.
        </p>
      )}
      {effectiveKind === "ads" && marketplace === "mercado_livre" && (
        <p className="mb-3 text-xs text-ink-3">
          Arquivo com mais de um mês? Escolha o primeiro mês dele: cada semana vai para o seu mês.
        </p>
      )}
      {(effectiveKind === "trafego" || (effectiveKind === "ads" && marketplace !== "mercado_livre")) && (
        <p className="mb-3 text-xs text-ink-3">
          Esse relatório soma o período inteiro sem separar por mês: envie um arquivo por mês.
        </p>
      )}

      {error && <p className="mb-3 rounded bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>}

      {grouped.length > 0 ? (
        <div className="divide-y divide-navy/[.06]">
          {grouped.map(([monthKey, monthReports]) => (
            <div key={monthKey} className="py-3">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-3">
                {monthLabel(monthReports[0].report_month)}
              </p>
              <ul className="flex flex-col gap-2">
                {monthReports.map((report) => (
                  <li
                    key={report.id}
                    className="group flex items-center gap-3 rounded-lg bg-panel-2/40 px-3 py-2"
                  >
                    <FileSpreadsheet className="h-4 w-4 flex-shrink-0 text-ink-3" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-ink" title={report.name}>
                        {report.name}
                      </p>
                      <p className="text-xs text-ink-3">
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
                      className="rounded p-1.5 text-ink-3 transition-colors hover:bg-panel hover:text-ink disabled:opacity-40"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownload(report.path)}
                      aria-label={`Baixar ${report.name}`}
                      className="rounded p-1.5 text-ink-3 transition-colors hover:bg-panel hover:text-ink"
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
                        className="rounded p-1.5 text-ink-3 opacity-0 transition-all hover:bg-danger/10 hover:text-danger focus:opacity-100 group-hover:opacity-100"
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
        <p className="mt-2 text-sm text-ink-3">
          Nenhum documento de {KINDS.find((k) => k.value === kind)?.label.toLowerCase()} enviado
          ainda para {MARKETPLACE_LABEL[marketplace] ?? marketplace}.
        </p>
      )}
    </div>
  );
}
