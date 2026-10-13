import Decimal from "decimal.js";
import type { CafeDataset, DataRow } from "./data/types";

const n = (row: DataRow, key: string) => Number(row[key] ?? 0);
const s = (row: DataRow, key: string) => String(row[key] ?? "");

export type ProductCostLine = { materialId: string; name: string; unit: string; quantity: number; unitCost: number; cost: number };
export type ProductCost = { menuId: string; name: string; price: number; unitCost: number; costRate: number | null; lines: ProductCostLine[] };

export function calculateProductCost(data: CafeDataset, menuId: string, asOf = data.meta.asOf): ProductCost | null {
  const menu = data.menus.find((row) => s(row, "menuId") === menuId);
  if (!menu) return null;
  const recipes = data.recipes.filter((row) => s(row, "menuId") === menuId && s(row, "recipeVersion") === s(menu, "recipeVersion"));
  const lines: ProductCostLine[] = [];
  for (const recipe of recipes) {
    const material = data.materials.find((row) => s(row, "materialId") === s(recipe, "materialId"));
    if (!material) continue;
    const price = data.priceHistory.filter((row) => s(row, "materialId") === s(material, "materialId") && s(row, "effectiveDate") <= asOf).sort((a, b) => s(b, "effectiveDate").localeCompare(s(a, "effectiveDate")))[0];
    if (!price) continue;
    const unitCost = new Decimal(n(price, "packPrice")).div(n(price, "packQuantity") || 1);
    lines.push({ materialId: s(material, "materialId"), name: s(material, "name"), unit: s(material, "unit"), quantity: n(recipe, "quantity"), unitCost: unitCost.toDecimalPlaces(4).toNumber(), cost: unitCost.mul(n(recipe, "quantity")).toDecimalPlaces(0).toNumber() });
  }
  const unitCost = lines.reduce((sum, line) => sum + line.cost, 0);
  const price = n(menu, "price");
  return { menuId, name: s(menu, "name"), price, unitCost, costRate: price > 0 ? (unitCost / price) * 100 : null, lines };
}
