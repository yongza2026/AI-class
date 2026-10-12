import { z } from "zod";
import type { CafeDataset, DatasetSummary, DatasetTable, ImportIssue } from "./types";

const text = z.string().trim().min(1);
const dateText = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const monthText = z.string().regex(/^\d{4}-\d{2}$/);
const nonNegative = z.number().finite().nonnegative();
const positive = z.number().finite().positive();

const metaSchema = z.object({
  datasetId: text,
  version: text,
  dataClass: text,
  storeName: text,
  startDate: dateText,
  asOf: dateText,
  currency: text,
  amountBasis: text,
  source: text,
  seed: z.number().int(),
});

const supplierSchema = z.object({ supplierId: text, name: text, dataClass: text });
const materialSchema = z.object({
  materialId: text, name: text, unit: text, packQuantity: positive, basePackPrice: nonNegative,
  leadDays: z.number().int().nonnegative(), safetyDays: z.number().int().nonnegative(), supplierId: text,
});
const menuSchema = z.object({ menuId: text, name: text, price: nonNegative, category: text, recipeVersion: text });
const recipeSchema = z.object({ recipeVersion: text, menuId: text, materialId: text, quantity: nonNegative, unit: text, channelOnly: z.string().nullable().optional() });
const priceSchema = z.object({ materialId: text, effectiveDate: dateText, packPrice: nonNegative, packQuantity: positive });
const calendarSchema = z.object({ date: dateText, isOpen: z.boolean(), recordComplete: z.boolean(), weather: z.string().nullable().optional(), note: z.string().nullable().optional() });
const saleSchema = z.object({
  saleId: text, date: dateText, menuId: text, channel: z.enum(["매장", "포장"]), quantity: z.number().int().positive(),
  unitPrice: nonNegative, discountAmount: nonNegative, netSales: nonNegative, paymentFee: nonNegative,
  recipeVersion: text, unitFoodCostSnapshot: nonNegative, unitPackagingCostSnapshot: nonNegative,
});
const openingSchema = z.object({ materialId: text, date: dateText, quantity: nonNegative, unit: text });
const eventSchema = z.object({
  eventId: text, date: dateText, materialId: text, eventType: z.enum(["입고", "폐기", "실사조정"]),
  quantity: z.number().finite(), unit: text, reason: z.string().nullable().optional(), unitCost: z.number().nonnegative().nullable().optional(),
  supplierId: z.string().nullable().optional(), countedQuantity: z.number().nonnegative().nullable().optional(),
}).superRefine((row, context) => {
  if (row.eventType === "입고" && row.quantity <= 0) context.addIssue({ code: "custom", path: ["quantity"], message: "입고 수량은 양수여야 합니다." });
  if (row.eventType === "폐기" && row.quantity >= 0) context.addIssue({ code: "custom", path: ["quantity"], message: "폐기 수량은 음수여야 합니다." });
  if (row.eventType === "실사조정" && row.countedQuantity == null) context.addIssue({ code: "custom", path: ["countedQuantity"], message: "실사조정에는 실측수량이 필요합니다." });
});
const expenseSchema = z.object({ expenseId: text, date: dateText, category: text, amount: nonNegative, recognition: text });
const monthlySchema = z.object({ month: monthText, category: text, amount: nonNegative });
const settingSchema = z.object({ key: text, value: z.union([z.string(), z.number(), z.boolean(), z.null()]) });

export const datasetSchema = z.object({
  meta: metaSchema,
  suppliers: z.array(supplierSchema), materials: z.array(materialSchema), menus: z.array(menuSchema),
  recipes: z.array(recipeSchema), priceHistory: z.array(priceSchema), calendar: z.array(calendarSchema),
  sales: z.array(saleSchema), openingInventory: z.array(openingSchema), inventoryEvents: z.array(eventSchema),
  expenses: z.array(expenseSchema), monthlyExpensePlan: z.array(monthlySchema), settings: z.array(settingSchema),
});

const tables: DatasetTable[] = ["suppliers", "materials", "menus", "recipes", "priceHistory", "calendar", "sales", "openingInventory", "inventoryEvents", "expenses", "monthlyExpensePlan", "settings"];

function duplicate(values: string[]): string | undefined {
  const seen = new Set<string>();
  return values.find((value) => seen.has(value) || !seen.add(value));
}

export function validateDataset(input: unknown): { data?: CafeDataset; issues: ImportIssue[] } {
  const result = datasetSchema.safeParse(input);
  if (!result.success) {
    return { issues: result.error.issues.slice(0, 100).map((issue) => ({ sheet: String(issue.path[0] ?? "파일"), row: typeof issue.path[1] === "number" ? issue.path[1] + 2 : undefined, column: String(issue.path.at(-1) ?? ""), message: issue.message })) };
  }
  const data = result.data as CafeDataset;
  const issues: ImportIssue[] = [];
  const idChecks: Array<[string, string[]]> = [
    ["공급사", data.suppliers.map((x) => String(x.supplierId))], ["재료", data.materials.map((x) => String(x.materialId))],
    ["메뉴", data.menus.map((x) => String(x.menuId))], ["판매기록", data.sales.map((x) => String(x.saleId))],
    ["재고기록", data.inventoryEvents.map((x) => String(x.eventId))], ["비용기록", data.expenses.map((x) => String(x.expenseId))],
  ];
  for (const [sheet, ids] of idChecks) { const value = duplicate(ids); if (value) issues.push({ sheet, value, message: `ID가 중복되었습니다: ${value}` }); }
  const suppliers = new Set(data.suppliers.map((x) => x.supplierId));
  const materials = new Map(data.materials.map((x) => [x.materialId, x]));
  const menus = new Set(data.menus.map((x) => x.menuId));
  data.materials.forEach((x, i) => { if (!suppliers.has(x.supplierId)) issues.push({ sheet: "재료", row: i + 2, column: "공급사ID", value: x.supplierId, message: "공급사 시트에 없는 ID입니다." }); });
  data.recipes.forEach((x, i) => {
    if (!menus.has(x.menuId)) issues.push({ sheet: "레시피", row: i + 2, column: "메뉴ID", value: x.menuId, message: "메뉴 시트에 없는 ID입니다." });
    if (!materials.has(x.materialId)) issues.push({ sheet: "레시피", row: i + 2, column: "재료ID", value: x.materialId, message: "재료 시트에 없는 ID입니다." });
    else if (materials.get(x.materialId)?.unit !== x.unit) issues.push({ sheet: "레시피", row: i + 2, column: "단위", value: x.unit, message: "재료의 기준단위와 다릅니다." });
  });
  data.sales.forEach((x, i) => { if (!menus.has(x.menuId)) issues.push({ sheet: "판매기록", row: i + 2, column: "메뉴ID", value: x.menuId, message: "메뉴 시트에 없는 ID입니다." }); });
  const saleKeys = data.sales.map((x) => `${x.date}|${x.menuId}|${x.channel}`);
  const duplicateSale = duplicate(saleKeys);
  if (duplicateSale) issues.push({ sheet: "판매기록", value: duplicateSale, message: "같은 날짜·메뉴·채널의 판매가 중복되었습니다." });
  data.sales.forEach((sale, i) => {
    const menu = data.menus.find((x) => x.menuId === sale.menuId);
    const recipeRows = data.recipes.filter((x) => x.menuId === sale.menuId && x.recipeVersion === sale.recipeVersion && (!x.channelOnly || x.channelOnly === sale.channel));
    if (menu && !recipeRows.length) issues.push({ sheet: "판매기록", row: i + 2, column: "레시피버전", value: sale.recipeVersion, message: "판매에 적용할 레시피가 없습니다." });
    for (const recipe of recipeRows) if (!data.priceHistory.some((price) => price.materialId === recipe.materialId && String(price.effectiveDate) <= String(sale.date))) issues.push({ sheet: "판매기록", row: i + 2, column: "일자", value: sale.date, message: `${recipe.materialId} 재료의 판매일 기준 가격이 없습니다.` });
  });
  for (const [sheet, rows] of [["재료가격이력", data.priceHistory], ["초기재고", data.openingInventory], ["재고기록", data.inventoryEvents]] as const) {
    rows.forEach((x, i) => { if (!materials.has(String(x.materialId))) issues.push({ sheet, row: i + 2, column: "재료ID", value: x.materialId, message: "재료 시트에 없는 ID입니다." }); });
  }
  return issues.length ? { issues } : { data, issues: [] };
}

export function summarize(data: CafeDataset): DatasetSummary {
  const counts = Object.fromEntries(tables.map((key) => [key, data[key].length])) as Record<DatasetTable, number>;
  return { storeName: data.meta.storeName, dataClass: data.meta.dataClass, asOf: data.meta.asOf, counts, totalRecords: Object.values(counts).reduce((a, b) => a + b, 0) };
}
