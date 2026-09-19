export type Client = {
  id: string;
  name: string;
  store_name: string | null;
  marketplaces: string[];
  contact_email: string | null;
  contact_phone: string | null;
  status: "active" | "inactive";
  notes: string | null;
  monthly_fee: number | null;
  payment_day: number | null;
  payment_method: string | null;
  created_at: string;
};

export type ClientAccount = {
  id: string;
  client_id: string;
  marketplace: string;
  store_name: string;
  cnpj: string | null;
  created_at: string;
};

export type ClientUpdate = {
  id: string;
  client_id: string;
  kind: "update" | "meeting";
  title: string;
  body: string | null;
  happened_on: string;
  created_at: string;
};

export type ClientFile = {
  id: string;
  client_id: string;
  name: string;
  path: string;
  size: number | null;
  created_at: string;
};

export type ClientChangeStatus = "aberta" | "em_andamento" | "concluida" | "monitorando";

export type ClientChangeCategory =
  | "preco"
  | "oferta"
  | "campanha"
  | "estoque"
  | "atendimento_amazon"
  | "conteudo"
  | "avaliacao"
  | "outro";

export type ClientChange = {
  id: string;
  client_id: string;
  changed_on: string;
  marketplace: string | null;
  account_id: string | null;
  category: ClientChangeCategory | null;
  description: string;
  reason: string | null;
  owner: string | null;
  status: ClientChangeStatus;
  closed_on: string | null;
  goal: string | null;
  evidence: string | null;
  created_at: string;
};

export type SalesReportKind = "vendas" | "trafego" | "ads";

export type SalesReport = {
  id: string;
  client_id: string;
  kind: SalesReportKind;
  marketplace: string;
  report_month: string | null;
  name: string;
  path: string;
  size: number | null;
  status: "recebido" | "processado" | "erro";
  created_at: string;
};

export type SalesOrder = {
  id: string;
  client_id: string;
  sales_report_id: string;
  marketplace: string;
  report_month: string;
  order_id: string;
  status: string | null;
  refund_status: string | null;
  created_on: string | null;
  product_name: string | null;
  sku: string | null;
  quantity: number;
  returned_quantity: number;
  unit_price: number;
  subtotal: number;
  total_value: number;
  shipping_fee_buyer: number;
  transaction_fee: number;
  commission_fee: number;
  service_fee: number;
  net_settlement: number;
  cost: number | null;
  extra_costs: number | null;
  tax_percent: number | null;
  raw: Record<string, unknown> | null;
  created_at: string;
};

export type ClientLink = {
  id: string;
  client_id: string;
  label: string;
  url: string;
  created_at: string;
};

export type Task = {
  id: string;
  title: string;
  description: string | null;
  client_id: string | null;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high";
  due_date: string | null;
  created_at: string;
};

export type FinanceEntry = {
  id: string;
  client_id: string | null;
  type: "income" | "expense";
  description: string;
  amount: number;
  due_date: string | null;
  status: "pending" | "paid";
  created_at: string;
};
