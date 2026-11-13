import type { CafeDataset, DataRow } from "./data/types";
import { BASE_UNITS, convertToBase } from "./inventoryDomain";
import { valueOf } from "./format";

export type MaterialForm = { materialId?: string; name: string; brand: string; category: string; sourceType: "구매" | "자체 제조"; unit: string; purchaseUnit: string; packageCapacity: string; allowFraction: boolean; supplierId: string; location: string; safetyStock: string; targetStock: string; active: boolean };
export function blankMaterialForm(): MaterialForm {
  return { name: "", brand: "", category: "", sourceType: "구매", unit: "ml", purchaseUnit: "ml", packageCapacity: "", allowFraction: false, supplierId: "", location: "", safetyStock: "", targetStock: "", active: true };
}
export function materialFormFor(row: DataRow): MaterialForm {
  return { materialId: valueOf(row, "materialId"), name: valueOf(row, "name"), brand: valueOf(row, "brand"), category: valueOf(row, "category"), sourceType: row.sourceType === "자체 제조" ? "자체 제조" : "구매", unit: valueOf(row, "unit"), purchaseUnit: valueOf(row, "purchaseUnit") || valueOf(row, "unit"), packageCapacity: String(row.packageCapacity ?? row.packQuantity ?? ""), allowFraction: row.allowFraction === true, supplierId: valueOf(row, "supplierId"), location: valueOf(row, "location"), safetyStock: String(row.safetyStock ?? ""), targetStock: String(row.targetStock ?? ""), active: row.active !== false };
}
export function materialFormError(form: MaterialForm, data: CafeDataset | null): string {
  if (!form.name.trim()) return "품목 이름을 입력해 주세요.";
  if (!BASE_UNITS.some((unit) => unit === form.unit)) return "기준 단위를 선택해 주세요.";
  const capacity = Number(form.packageCapacity);
  if (!Number.isFinite(capacity) || capacity <= 0) return "포장 용량은 0보다 큰 숫자로 입력해 주세요.";
  try { convertToBase(capacity, form.purchaseUnit, form.unit); } catch { return "구매 표기 단위와 기준 단위는 같은 종류여야 합니다."; }
  for (const [label, value] of [["안전 재고", form.safetyStock], ["목표 재고", form.targetStock]]) {
    if (value !== "" && (!Number.isFinite(Number(value)) || Number(value) < 0)) return `${label}는 0 이상의 숫자로 입력해 주세요.`;
  }
  if (form.targetStock !== "" && form.safetyStock !== "" && Number(form.targetStock) < Number(form.safetyStock)) return "목표 재고는 안전 재고 이상이어야 합니다.";
  const existing = data?.materials.find((row) => row.materialId === form.materialId);
  const linked = existing && data && [data.openingInventory, data.inventoryEvents, data.recipes, data.purchaseLots, data.bottleStates].some((rows) => rows.some((row) => row.materialId === form.materialId));
  const batched = existing && data?.productionBatches.some((row) => row.outputMaterialId === form.materialId);
  if ((linked || batched) && existing?.unit !== form.unit) return "기록이 있는 품목의 기준 단위는 바꿀 수 없습니다. 새 규격 품목으로 추가해 주세요.";
  return "";
}
