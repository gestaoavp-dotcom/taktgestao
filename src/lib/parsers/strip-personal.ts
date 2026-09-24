// Drops the buyer's personal data before a report row is stored.
//
// Marketplace exports carry the customer's name, document number, full address
// and phone. None of it is used here: the system reads money, products and
// dates. Keeping it anyway meant holding the personal data of thousands of
// other companies' customers, for nothing — and showing it in the "all other
// columns" panel of every order.
//
// It also happens to be a third of each row's size.
//
// Deny-list rather than keep-list on purpose: a keep-list silently drops a new
// money column the next export adds, and losing a figure is a worse failure
// here than keeping a harmless one.

/** Exact column names, because some are ambiguous by pattern. */
const PERSONAL_KEYS = new Set([
  // Mercado Livre. "Estado" is the order's status; "Estado_1" is the buyer's.
  "Comprador",
  "Dados pessoais ou da empresa",
  "Tipo e número do documento",
  "CPF",
  "CNPJ",
  "Endereço",
  "Cidade",
  "Estado_1",
  "CEP",
  "País",
  "Negócio",
  "Tipo de contribuinte",
  "Inscrição estadual",
  "Número de rastreamento",
  "URL de acompanhamento",
  // Shopee.
  "Nome de usuário (Comprador)",
  "Nome do Destinatário",
  "Telefone",
  "CPF do Comprador",
  "Endereço de entrega",
  "Cidade do destinatário",
  "UF do destinatário",
  "País do destinatário",
  "Número de rastreamento da Shopee",
  "Observação do comprador",
]);

/** Catches the numbered duplicates SheetJS makes, and anything close. */
const PERSONAL_PATTERN =
  /^(comprador|destinat|endere|cidade|cep|país|pais|cpf|cnpj|telefone|contato|rastrea|url de acompanhamento|tipo e número do documento|dados pessoais|inscrição estadual|tipo de contribuinte|nome do destinat|observação do comprador|estado_\d)/i;

export function stripPersonal(raw: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(raw).filter(([key]) => {
      const base = key.replace(/_\d+$/, "");
      if (PERSONAL_KEYS.has(key) || PERSONAL_KEYS.has(base)) return false;
      return !PERSONAL_PATTERN.test(key);
    }),
  );
}
