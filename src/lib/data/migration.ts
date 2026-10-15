import type { CafeDataset, DataRow } from "./types";

const NEW_TABLES = ["purchaseLots", "productionBatches", "bottleStates", "auditLog"] as const;

export function migrateDataset(input: unknown): CafeDataset {
  const source = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const migrated = { ...source } as Record<string, unknown>;
  for (const table of NEW_TABLES) migrated[table] = Array.isArray(source[table]) ? source[table] : [];
  const meta = { ...((source.meta ?? {}) as Record<string, unknown>) };
  if (!meta.version || String(meta.version).startsWith("1")) meta.version = "2.0";
  migrated.meta = meta;
  return migrated as unknown as CafeDataset;
}

export function emptyDataset(today: string): CafeDataset {
  return {
    meta: { datasetId: `POCO-${today}`, version: "2.0", dataClass: "실제 매장", storeName: "POCO", startDate: today, asOf: today, currency: "KRW", amountBasis: "부가세 포함 총액", source: "직접 입력", seed: 0 },
    suppliers: [], materials: [], menus: [], recipes: [], priceHistory: [], calendar: [], sales: [],
    openingInventory: [], inventoryEvents: [], expenses: [], monthlyExpensePlan: [], settings: [],
    purchaseLots: [], productionBatches: [], bottleStates: [], auditLog: [],
  };
}

export function auditRow(action: string, table: string, recordId: string, before: DataRow | null, after: DataRow | null, reason = ""): DataRow {
  return { auditId: crypto.randomUUID(), occurredAt: new Date().toISOString(), action, table, recordId, beforeJson: before ? JSON.stringify(before) : null, afterJson: after ? JSON.stringify(after) : null, reason };
}
