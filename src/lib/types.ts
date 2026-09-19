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

export type ClientChange = {
  id: string;
  client_id: string;
  changed_on: string;
  description: string;
  reason: string | null;
  goal: string | null;
  owner: string | null;
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
