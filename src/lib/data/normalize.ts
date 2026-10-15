import type { DataRow } from "./types";

const maps: Record<string, Record<string, string>> = {
  meta: { dataset_id: "datasetId", data_class: "dataClass", store_name: "storeName", start_date: "startDate", as_of: "asOf", amount_basis: "amountBasis" },
  suppliers: { supplier_id: "supplierId", data_class: "dataClass" },
  materials: { material_id: "materialId", pack_quantity: "packQuantity", base_pack_price: "basePackPrice", lead_days: "leadDays", safety_days: "safetyDays", supplier_id: "supplierId" },
  menus: { menu_id: "menuId", recipe_version: "recipeVersion" },
  recipes: { recipe_version: "recipeVersion", menu_id: "menuId", material_id: "materialId", channel_only: "channelOnly" },
  priceHistory: { material_id: "materialId", effective_date: "effectiveDate", pack_price: "packPrice", pack_quantity: "packQuantity" },
  calendar: { is_open: "isOpen", record_complete: "recordComplete" },
  sales: { sale_id: "saleId", menu_id: "menuId", unit_price: "unitPrice", discount_amount: "discountAmount", net_sales: "netSales", payment_fee: "paymentFee", recipe_version: "recipeVersion", unit_food_cost_snapshot: "unitFoodCostSnapshot", unit_packaging_cost_snapshot: "unitPackagingCostSnapshot" },
  openingInventory: { material_id: "materialId" },
  inventoryEvents: { event_id: "eventId", material_id: "materialId", event_type: "eventType", unit_cost: "unitCost", supplier_id: "supplierId", counted_quantity: "countedQuantity" },
  expenses: { expense_id: "expenseId" },
  monthlyExpensePlan: {}, settings: {}, purchaseLots: {}, productionBatches: {}, bottleStates: {}, auditLog: {},
};
maps.monthlyExpensePlan = { month: "month" };

const dateFields = new Set(["startDate", "asOf", "date", "effectiveDate", "month"]);

function isoDate(value: unknown, monthOnly = false): unknown {
  if (value instanceof Date) return value.toISOString().slice(0, monthOnly ? 7 : 10);
  if (typeof value === "string" && /^\d{4}-\d{2}/.test(value)) return value.slice(0, monthOnly ? 7 : 10);
  return value;
}

export function mapRow(row: Record<string, unknown>, section: string): DataRow {
  const mapping = maps[section] ?? {};
  return Object.fromEntries(Object.entries(row).map(([key, value]) => {
    const nextKey = mapping[key] ?? key;
    return [nextKey, dateFields.has(nextKey) ? isoDate(value, nextKey === "month") : value];
  })) as DataRow;
}

export function normalizeExternalJson(input: unknown): unknown {
  if (!input || typeof input !== "object") return input;
  const source = input as Record<string, unknown>;
  if (source.data && source.backupFormat) return source;
  const aliases: Record<string, string> = { price_history: "priceHistory", opening_inventory: "openingInventory", inventory_events: "inventoryEvents", monthly_expense_plan: "monthlyExpensePlan", purchase_lots: "purchaseLots", production_batches: "productionBatches", bottle_states: "bottleStates", audit_log: "auditLog" };
  const out: Record<string, unknown> = {};
  for (const [rawKey, value] of Object.entries(source)) {
    const key = aliases[rawKey] ?? rawKey;
    if (key === "meta") out.meta = mapRow(value as Record<string, unknown>, "meta");
    else if (key === "settings") out.settings = Array.isArray(value) ? value.map((x) => mapRow(x, "settings")) : Object.entries((value ?? {}) as Record<string, unknown>).map(([settingKey, settingValue]) => ({ key: settingKey, value: settingValue as string | number | boolean | null }));
    else if (Array.isArray(value)) out[key] = value.map((row) => mapRow(row, key));
    else out[key] = value;
  }
  return out;
}
