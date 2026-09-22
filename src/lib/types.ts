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
  cnpj_id: string | null;
  created_at: string;
};

/** A reajuste: what a CNPJ paid before, what it pays now, and why. */
export type ClientFeeChange = {
  id: string;
  client_id: string;
  cnpj_id: string;
  effective_on: string;
  previous_amount: number | null;
  amount: number;
  note: string | null;
  created_at: string;
};

/** The billing unit: one CNPJ, which may hold several stores. */
export type ClientCnpj = {
  id: string;
  client_id: string;
  cnpj: string;
  label: string | null;
  monthly_fee: number | null;
  payment_day: number | null;
  payment_method: string | null;
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

export type SalesReportKind = "pedidos" | "trafego" | "ads";

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

export type SalesAd = {
  id: string;
  client_id: string;
  sales_report_id: string;
  marketplace: string;
  report_month: string;
  ad_name: string;
  status: string | null;
  ad_type: string | null;
  bid_method: string | null;
  placement: string | null;
  product_id: string | null;
  started_on: string | null;
  ended_on: string | null;
  impressions: number;
  clicks: number;
  add_to_cart: number;
  conversions: number;
  direct_conversions: number;
  items_sold: number;
  direct_items_sold: number;
  gmv: number;
  direct_revenue: number;
  expense: number;
  raw: Record<string, unknown> | null;
  created_at: string;
};

export type SalesTraffic = {
  id: string;
  client_id: string;
  sales_report_id: string;
  marketplace: string;
  report_month: string;
  item_id: string | null;
  product_name: string;
  sku: string | null;
  variation_name: string | null;
  is_variation: boolean;
  impressions: number;
  clicks: number;
  unique_impressions: number;
  unique_clicks: number;
  visitors: number;
  page_views: number;
  bounced_visitors: number;
  search_clicks: number;
  likes: number;
  cart_visitors: number;
  cart_units: number;
  orders_placed: number;
  orders_paid: number;
  units_placed: number;
  units_paid: number;
  buyers_placed: number;
  buyers_paid: number;
  sales_placed: number;
  sales_paid: number;
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

export type TaxSettings = {
  id: string;
  rate_percent: number;
  updated_at: string;
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

/**
 * One marketplace login. The encrypted password is deliberately absent: the
 * listing never selects it, and `has_password` (generated in Postgres) is what
 * says whether one exists.
 */
export type ClientCredential = {
  id: string;
  client_id: string;
  marketplace: string | null;
  store_name: string;
  label: string | null;
  login: string | null;
  url: string | null;
  notes: string | null;
  has_password: boolean;
  created_at: string;
  updated_at: string;
};
