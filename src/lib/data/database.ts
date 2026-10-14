import Dexie, { type Table } from "dexie";
import type { CafeDataset, DataRow, DatasetSummary, DatasetTable } from "./types";
import { summarize } from "./schema";

type MetaRecord = CafeDataset["meta"] & { id: "current" };

class CafeDatabase extends Dexie {
  meta!: Table<MetaRecord, string>;
  suppliers!: Table<DataRow, string>;
  materials!: Table<DataRow, string>;
  menus!: Table<DataRow, string>;
  recipes!: Table<DataRow, [string, string, string]>;
  priceHistory!: Table<DataRow, [string, string]>;
  calendar!: Table<DataRow, string>;
  sales!: Table<DataRow, string>;
  openingInventory!: Table<DataRow, string>;
  inventoryEvents!: Table<DataRow, string>;
  expenses!: Table<DataRow, string>;
  monthlyExpensePlan!: Table<DataRow, [string, string]>;
  settings!: Table<DataRow, string>;

  constructor() {
    super("cafe-operations");
    this.version(1).stores({
      meta: "id",
      suppliers: "supplierId",
      materials: "materialId,supplierId",
      menus: "menuId,name",
      recipes: "[recipeVersion+menuId+materialId],menuId,materialId",
      priceHistory: "[materialId+effectiveDate],materialId,effectiveDate",
      calendar: "date,isOpen,recordComplete",
      sales: "saleId,date,menuId,channel,[date+menuId+channel]",
      openingInventory: "materialId,date",
      inventoryEvents: "eventId,date,materialId,eventType",
      expenses: "expenseId,date,category",
      monthlyExpensePlan: "[month+category],month,category",
      settings: "key",
    });
  }
}

export const db = new CafeDatabase();

const tableNames: DatasetTable[] = ["suppliers", "materials", "menus", "recipes", "priceHistory", "calendar", "sales", "openingInventory", "inventoryEvents", "expenses", "monthlyExpensePlan", "settings"];

export async function replaceDataset(data: CafeDataset): Promise<void> {
  const stores = [db.meta, ...tableNames.map((name) => db.table(name))];
  await db.transaction("rw", stores, async () => {
    await Promise.all(stores.map((table) => table.clear()));
    await db.meta.put({ id: "current", ...data.meta });
    for (const name of tableNames) if (data[name].length) await db.table(name).bulkAdd(data[name]);
  });
}

export async function clearSampleDataset(): Promise<void> {
  const meta = await db.meta.get("current");
  if (!meta || !meta.dataClass.includes("샘플")) {
    throw new Error("가상 샘플 자료만 이 기능으로 삭제할 수 있습니다.");
  }
  const stores = [db.meta, ...tableNames.map((name) => db.table(name))];
  await db.transaction("rw", stores, async () => {
    await Promise.all(stores.map((table) => table.clear()));
  });
}

export async function readDataset(): Promise<CafeDataset | null> {
  const meta = await db.meta.get("current");
  if (!meta) return null;
  const cleanMeta = Object.fromEntries(Object.entries(meta).filter(([key]) => key !== "id")) as CafeDataset["meta"];
  const entries = await Promise.all(tableNames.map(async (name) => [name, await db.table(name).toArray()] as const));
  return { meta: cleanMeta, ...Object.fromEntries(entries) } as CafeDataset;
}

export async function readSummary(): Promise<DatasetSummary | null> {
  const data = await readDataset();
  return data ? summarize(data) : null;
}

export async function storageAvailable(): Promise<boolean> {
  if (typeof indexedDB === "undefined") return false;
  try { await db.open(); return true; } catch { return false; }
}

export async function saveRecord(table: "sales" | "expenses" | "inventoryEvents", row: DataRow): Promise<void> {
  await db.table(table).put(row);
}

export async function deleteRecord(table: "sales" | "expenses" | "inventoryEvents", id: string): Promise<void> {
  await db.table(table).delete(id);
}
