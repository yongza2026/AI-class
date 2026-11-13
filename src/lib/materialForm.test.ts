import { describe, expect, it } from "vitest";
import { emptyDataset } from "./data/migration";
import { blankMaterialForm, materialFormError, materialFormFor } from "./materialForm";

describe("품목 기준정보 편집 안전성", () => {
  it("미분류와 빈 안전·목표 재고를 임의 기본값으로 바꾸지 않는다", () => {
    const form = materialFormFor({ materialId: "I06", name: "레몬청", category: null, unit: "g", packQuantity: 1000 });
    expect(form.category).toBe("");
    expect(form.safetyStock).toBe("");
    expect(form.targetStock).toBe("");
    expect(form.packageCapacity).toBe("1000");
    expect(materialFormError(form, null)).toBe("");
  });
  it("kg와 g의 구매 규격을 허용하고 질량·부피 혼합은 거부한다", () => {
    const form = { ...blankMaterialForm(), name: "설탕", unit: "g", purchaseUnit: "kg", packageCapacity: "1" };
    expect(materialFormError(form, null)).toBe("");
    expect(materialFormError({ ...form, purchaseUnit: "L" }, null)).toContain("같은 종류");
  });
  it("음수·비수치 재고 기준과 목표가 안전 재고보다 작은 입력을 거부한다", () => {
    const form = { ...blankMaterialForm(), name: "진", packageCapacity: "700" };
    expect(materialFormError({ ...form, safetyStock: "-1" }, null)).toContain("안전 재고");
    expect(materialFormError({ ...form, targetStock: "NaN" }, null)).toContain("목표 재고");
    expect(materialFormError({ ...form, safetyStock: "100", targetStock: "50" }, null)).toContain("이상");
  });
  it.each(["openingInventory", "inventoryEvents", "recipes", "purchaseLots", "bottleStates"] as const)("%s 연결 품목의 기준 단위 변경을 막는다", (table) => {
    const data = emptyDataset("2026-11-13");
    data.materials = [{ materialId: "M1", name: "기존 품목", unit: "ml", packQuantity: 700 }];
    data[table] = [{ materialId: "M1" }];
    const form = { ...materialFormFor(data.materials[0]), unit: "g", purchaseUnit: "g" };
    expect(materialFormError(form, data)).toContain("기준 단위는 바꿀 수 없습니다");
  });
  it("제조 배치 산출물의 기준 단위 변경을 막는다", () => {
    const data = emptyDataset("2026-11-13");
    data.materials = [{ materialId: "M1", name: "코디얼", unit: "ml", packQuantity: 500 }];
    data.productionBatches = [{ outputMaterialId: "M1" }];
    expect(materialFormError({ ...materialFormFor(data.materials[0]), unit: "g", purchaseUnit: "g" }, data)).toContain("기준 단위");
  });
});
