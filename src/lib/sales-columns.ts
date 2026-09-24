// What a listing selects, written out instead of "*".
//
// `raw` is the reason: it holds the marketplace's whole report row — 66 columns
// for Mercado Livre — and selecting it doubles how long a page takes to read
// from the database, for something only ever shown one order at a time.
//
// Keeping the list here rather than inline means a new page gets it right by
// importing it, and a column added to the table does not silently start
// travelling to every browser.

/** Everything the Pedidos table draws or computes from. Never `raw`. */
export const ORDER_LIST_COLUMNS = [
  "id",
  "client_id",
  "marketplace",
  "account_id",
  "report_month",
  "order_id",
  "status",
  "created_on",
  "product_name",
  "sku",
  "quantity",
  "returned_quantity",
  "subtotal",
  "total_value",
  "net_settlement",
  "net_amount",
  "cost",
  "extra_costs",
  "tax_percent",
].join(", ");

/** What the summaries add up. Narrower again: no names, no costs. */
export const ORDER_SUMMARY_COLUMNS =
  "id, order_id, created_on, marketplace, subtotal, total_value, net_settlement";

/**
 * Rows per request when listing orders.
 *
 * One network trip's worth, whatever the client's size — which is the whole
 * point: a client with 30000 orders should open as fast as one with 300.
 */
export const ORDERS_PAGE = 200;
