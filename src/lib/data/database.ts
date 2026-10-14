import Dexie, { type Table } from "dexie";
import type { CafeDataset, DataRow, DatasetSummary, DatasetTable } from "./types";
import { summarize } from "./schema";
import { cloudConfigured, getStoreAccess, getSupabase } from "../supabase/client";

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

const recordKeys: Record<DatasetTable, string[]> = {
  suppliers: ["supplierId"], materials: ["materialId"], menus: ["menuId"], recipes: ["recipeVersion", "menuId", "materialId"],
  priceHistory: ["materialId", "effectiveDate"], calendar: ["date"], sales: ["saleId"], openingInventory: ["materialId", "date"],
  inventoryEvents: ["eventId"], expenses: ["expenseId"], monthlyExpensePlan: ["month", "category"], settings: ["key"],
};

function recordKey(table: DatasetTable, row: DataRow): string {
  const values = recordKeys[table].map((name) => String(row[name] ?? ""));
  if (values.some((value) => !value)) throw new Error(`${table} 자료의 식별값이 없습니다.`);
  return values.join("|");
}

async function replaceLocalDataset(data: CafeDataset): Promise<void> {
  const stores = [db.meta, ...tableNames.map((name) => db.table(name))];
  await db.transaction("rw", stores, async () => {
    await Promise.all(stores.map((table) => table.clear()));
    await db.meta.put({ id: "current", ...data.meta });
    for (const name of tableNames) if (data[name].length) await db.table(name).bulkAdd(data[name]);
  });
}

async function clearLocalDataset(): Promise<void> {
  const stores = [db.meta, ...tableNames.map((name) => db.table(name))];
  await db.transaction("rw", stores, async () => { await Promise.all(stores.map((table) => table.clear())); });
}

export async function replaceDataset(data: CafeDataset): Promise<void> {
  if (cloudConfigured()) {
    const records = tableNames.flatMap((table) => data[table].map((row) => ({ collection: table, record_key: recordKey(table, row), payload: row })));
    const { error } = await getSupabase().rpc("replace_store_dataset", { p_meta: data.meta, p_records: records });
    if (error) throw new Error(`공용 자료를 교체하지 못했습니다: ${error.message}`);
  }
  await replaceLocalDataset(data);
}

export async function clearSampleDataset(): Promise<void> {
  if (cloudConfigured()) {
    const { error } = await getSupabase().rpc("clear_sample_dataset");
    if (error) throw new Error(`샘플 자료를 삭제하지 못했습니다: ${error.message}`);
    await clearLocalDataset(); return;
  }
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
  if (cloudConfigured()) {
    const { storeId } = await getStoreAccess(); const supabase = getSupabase();
    const { data: dataset, error: metaError } = await supabase.from("store_datasets").select("meta").eq("store_id", storeId).maybeSingle();
    if (metaError) throw new Error(`공용 자료를 읽지 못했습니다: ${metaError.message}`);
    if (!dataset) { await clearLocalDataset(); return null; }
    const rows: { collection: DatasetTable; payload: DataRow }[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from("store_records").select("collection,payload").eq("store_id", storeId).range(from, from + 999);
      if (error) throw new Error(`공용 기록을 읽지 못했습니다: ${error.message}`);
      rows.push(...((data ?? []) as typeof rows)); if (!data || data.length < 1000) break;
    }
    const collections = {} as Record<DatasetTable, DataRow[]>;
    for (const name of tableNames) collections[name] = [];
    for (const row of rows) if (tableNames.includes(row.collection)) collections[row.collection].push(row.payload);
    const remote = { meta: dataset.meta, ...collections } as CafeDataset; await replaceLocalDataset(remote); return remote;
  }
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
  if (cloudConfigured()) return true;
  if (typeof indexedDB === "undefined") return false;
  try { await db.open(); return true; } catch { return false; }
}

export async function saveRecord(table: "sales" | "expenses" | "inventoryEvents", row: DataRow): Promise<void> {
  if (cloudConfigured()) {
    const { storeId } = await getStoreAccess();
    const { error } = await getSupabase().from("store_records").upsert({ store_id: storeId, collection: table, record_key: recordKey(table, row), payload: row });
    if (error) throw new Error(`공용 기록을 저장하지 못했습니다: ${error.message}`);
  }
  await db.table(table).put(row);
}

export async function deleteRecord(table: "sales" | "expenses" | "inventoryEvents", id: string): Promise<void> {
  if (cloudConfigured()) {
    const { storeId } = await getStoreAccess();
    const { error } = await getSupabase().from("store_records").delete().eq("store_id", storeId).eq("collection", table).eq("record_key", id);
    if (error) throw new Error(`공용 기록을 삭제하지 못했습니다: ${error.message}`);
  }
  await db.table(table).delete(id);
}
