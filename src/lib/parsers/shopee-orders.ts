// Parses the "orders.all" report Shopee's seller center exports —
// one row per product line in an order, in Portuguese (BR) headers.

export type ParsedShopeeOrder = {
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
  raw: Record<string, unknown>;
};

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (!value) return 0;
  const n = parseFloat(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function toDateOnly(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "string" && value.trim()) {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return match[0];
  }
  return null;
}

export function parseShopeeOrders(rows: Record<string, unknown>[]): ParsedShopeeOrder[] {
  return rows
    .filter((row) => row["ID do pedido"])
    .map((row) => ({
      order_id: String(row["ID do pedido"]).trim(),
      status: (row["Status do pedido"] as string) || null,
      refund_status: (row["Status da Devolução / Reembolso"] as string) || null,
      created_on: toDateOnly(row["Data de criação do pedido"]),
      product_name: (row["Nome do Produto"] as string) || null,
      sku: (row["Número de referência SKU"] as string) || null,
      quantity: toNumber(row["Quantidade"]),
      returned_quantity: toNumber(row["Returned quantity"]),
      unit_price: toNumber(row["Preço acordado"]),
      subtotal: toNumber(row["Subtotal do produto"]),
      total_value: toNumber(row["Valor Total"]),
      shipping_fee_buyer: toNumber(row["Taxa de envio pagas pelo comprador"]),
      transaction_fee: toNumber(row["Taxa de transação"]),
      commission_fee: toNumber(row["Taxa de comissão líquida"]),
      service_fee: toNumber(row["Taxa de serviço líquida"]),
      net_settlement: toNumber(row["Total global"]),
      raw: row,
    }));
}
