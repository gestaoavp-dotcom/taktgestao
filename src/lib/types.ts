export type Client = {
  id: string;
  name: string;
  store_name: string | null;
  marketplaces: string[];
  contact_email: string | null;
  contact_phone: string | null;
  status: "active" | "inactive";
  notes: string | null;
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
