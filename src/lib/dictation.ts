// Turns a spoken description of a change into the Controle form's fields.
//
// The team dictates in a predictable order — "no dia 15, na conta Obachei,
// categoria campanha, ajustei o lance..., pelo motivo..., responsável Jean,
// está em andamento, o resultado esperado é..., observação..." — so the
// transcript is split on those spoken markers and each slice becomes a field.
//
// Nothing is saved automatically: the parsed fields land in the form for the
// person to check before registering.

import { CHANGE_CATEGORIES, type ChangeChannelOption } from "@/lib/client-changes";
import { CHANGE_STATUSES } from "@/lib/client-changes";

export type DictatedChange = {
  changed_on?: string;
  channelKey?: string;
  category?: string;
  status?: string;
  description?: string;
  reason?: string;
  owner?: string;
  goal?: string;
  evidence?: string;
};

type Marker = { field: keyof DictatedChange | "acao"; pattern: RegExp };

// Longer phrases first: "resultado esperado" must win over a bare "esperado".
const MARKERS: Marker[] = [
  { field: "changed_on", pattern: /\b(?:no dia|na data(?: de)?|dia)\b/ },
  { field: "channelKey", pattern: /\b(?:na conta|conta|na loja|loja|no canal|canal)\b/ },
  { field: "category", pattern: /\b(?:categoria|tipo)\b/ },
  { field: "acao", pattern: /\b(?:a[cç][aã]o feita|a[cç][aã]o|fiz(?: a)?|eu fiz)\b/ },
  { field: "reason", pattern: /\b(?:pelo motivo|por causa|motivo|porque|gatilho)\b/ },
  { field: "owner", pattern: /\b(?:respons[aá]ve(?:l|is)|quem fez|feito por)\b/ },
  {
    field: "status",
    pattern:
      /\b(?:o status|status|(?:a tarefa )?est[aá]|situa[cç][aã]o)\b(?=[^,.;]{0,12}(?:aberta|em andamento|conclu|monitorando))/,
  },
  { field: "goal", pattern: /\b(?:resultado esperado|espero que|esperado|meta|m[eé]trica)\b/ },
  { field: "evidence", pattern: /\b(?:observa[cç][aã]o|evid[eê]ncia|obs)\b/ },
];

const MONTHS = [
  "janeiro",
  "fevereiro",
  "mar[cç]o",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function toISO(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "hoje", "ontem", "dia 15", "15 de agosto" — anything else stays empty. */
function parseDate(segment: string, whole: string): string | undefined {
  const text = normalize(`${segment} ${whole}`);
  const today = new Date();

  if (/\bhoje\b/.test(text)) return toISO(today);
  if (/\bontem\b/.test(text)) {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    return toISO(d);
  }

  const withMonth = normalize(segment).match(
    new RegExp(`\\b(\\d{1,2})\\s*(?:de\\s*)?(${MONTHS.map(normalize).join("|")})\\b`),
  );
  if (withMonth) {
    const day = Number(withMonth[1]);
    const month = MONTHS.map(normalize).indexOf(withMonth[2]);
    return toISO(new Date(today.getFullYear(), month, day));
  }

  const dayOnly = normalize(segment).match(/\b(\d{1,2})\b/);
  if (dayOnly) {
    const day = Number(dayOnly[1]);
    if (day >= 1 && day <= 31) return toISO(new Date(today.getFullYear(), today.getMonth(), day));
  }
  return undefined;
}

/**
 * Picks the option named in the spoken text. `aliases` lets a channel be found
 * by its store name or by its marketplace ("na Shopee"). Returns what is left
 * of the segment too, since people run the value straight into the next idea
 * ("categoria oferta ativei o cupom").
 */
function matchOption<T extends { aliases: string[] }>(
  segment: string,
  whole: string,
  options: T[],
): { option?: T; rest: string } {
  const pairs = options
    .flatMap((option) => option.aliases.map((alias) => ({ option, alias })))
    .sort((a, b) => b.alias.length - a.alias.length);

  const inSegment = pairs.find((p) => normalize(segment).includes(normalize(p.alias)));
  if (inSegment) {
    const at = normalize(segment).indexOf(normalize(inSegment.alias));
    return {
      option: inSegment.option,
      rest: clean(segment.slice(0, at) + " " + segment.slice(at + inSegment.alias.length)),
    };
  }

  // Often said outside its own marker: "subi o preço na Shopee".
  const anywhere = pairs.find((p) => normalize(whole).includes(normalize(p.alias)));
  return { option: anywhere?.option, rest: clean(segment) };
}

const FILLER = /^(?:e|de|da|do|o|a|os|as|é|eh|que|foi|um|uma)$/i;

/** Trims punctuation and the stray articles left at a segment's edges. */
function clean(text: string) {
  const trimmed = text.replace(/^[\s,.;:—-]+/, "").replace(/[\s,.;:—-]+$/, "");
  const words = trimmed ? trimmed.split(/\s+/) : [];
  while (words.length && FILLER.test(words[0].replace(/[,.;:]/g, ""))) words.shift();
  while (words.length && FILLER.test(words[words.length - 1].replace(/[,.;:]/g, ""))) words.pop();
  return words.join(" ").replace(/[\s,.;:—-]+$/, "").trim();
}

export function parseDictation(
  transcript: string,
  channels: ChangeChannelOption[],
): DictatedChange {
  const normalized = normalize(transcript);

  // Where each marker appears, so the text between two markers belongs to the
  // first of them.
  const hits: { field: Marker["field"]; start: number; end: number }[] = [];
  for (const marker of MARKERS) {
    const match = normalized.match(marker.pattern);
    if (match?.index != null) {
      hits.push({ field: marker.field, start: match.index, end: match.index + match[0].length });
    }
  }
  hits.sort((a, b) => a.start - b.start);

  const segments = new Map<Marker["field"], string>();
  hits.forEach((hit, i) => {
    const until = hits[i + 1]?.start ?? transcript.length;
    segments.set(hit.field, clean(transcript.slice(hit.end, until)));
  });

  // Nothing recognised: keep the whole sentence as the action itself.
  if (!segments.size) return { description: clean(transcript) };

  const channel = matchOption(
    segments.get("channelKey") ?? "",
    transcript,
    channels.map((c) => ({
      ...c,
      // "Mercado Livre — Obachei" is found by the store or by the marketplace.
      aliases: [c.label.replace(/^.*—\s*/, ""), c.label.replace(/\s*—.*$/, "")],
    })),
  );
  const category = matchOption(
    segments.get("category") ?? "",
    transcript,
    CHANGE_CATEGORIES.map((c) => ({ ...c, aliases: [c.label] })),
  );
  const status = matchOption(
    segments.get("status") ?? "",
    transcript,
    CHANGE_STATUSES.map((s) => ({ ...s, aliases: [s.label] })),
  );

  // Whatever trailed an enumerated value is the action itself.
  const description =
    segments.get("acao") || category.rest || channel.rest || status.rest || undefined;

  return {
    changed_on: segments.has("changed_on")
      ? parseDate(segments.get("changed_on") ?? "", transcript)
      : undefined,
    channelKey: channel.option?.key,
    category: category.option?.value,
    status: status.option?.value,
    description: description ? clean(description) : undefined,
    reason: segments.get("reason") || undefined,
    owner: segments.get("owner") || undefined,
    goal: segments.get("goal") || undefined,
    evidence: segments.get("evidence") || undefined,
  };
}
