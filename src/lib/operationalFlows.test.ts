import { describe, expect, it } from "vitest";
import { aggregateProfitability, calculateInventory, calculateSaleSnapshot } from "./calculations";
import { packageReceipt } from "./inventoryDomain";
import type { CafeDataset, DataRow } from "./data/types";

function dataset(overrides: Partial<CafeDataset> = {}): CafeDataset {
  return {
    meta: {
      datasetId: "regression-test",
      version: "1",
      dataClass: "검사용",
      storeName: "POCO",
      startDate: "2026-10-01",
      asOf: "2026-10-31",
      currency: "KRW",
      amountBasis: "VAT 포함",
      source: "test",
      seed: 1,
    },
    suppliers: [],
    materials: [],
    menus: [],
    recipes: [],
    priceHistory: [],
    calendar: [],
    sales: [],
    openingInventory: [],
    inventoryEvents: [],
    expenses: [],
    monthlyExpensePlan: [],
    settings: [],
    purchaseLots: [],
    productionBatches: [],
    bottleStates: [],
    auditLog: [],
    ...overrides,
  };
}

function material(materialId: string, name: string, unit = "ml"): DataRow {
  return {
    materialId,
    name,
    unit,
    packQuantity: 700,
    basePackPrice: 10_000,
    leadDays: 1,
    safetyDays: 1,
    supplierId: "S01",
  };
}

describe("운영 핵심 흐름 회귀 검사", () => {
  it("A. 700ml 두 병 입고는 기준 단위 1,400ml로 환산된다", () => {
    expect(packageReceipt(2, 700, "ml", "ml")).toBe(1_400);
  });

  it("B. 제조 배치는 원재료를 줄이고 완성품을 늘린다", () => {
    const data = dataset({
      materials: [material("M-BASE", "베이스"), material("M-PRODUCT", "완성품")],
      openingInventory: [
        { materialId: "M-BASE", date: "2026-10-01", quantity: 1_000, unit: "ml" },
        { materialId: "M-PRODUCT", date: "2026-10-01", quantity: 0, unit: "ml" },
      ],
      inventoryEvents: [
        { eventId: "E-IN", date: "2026-10-02", materialId: "M-BASE", eventType: "제조사용", quantity: -200, unit: "ml" },
        { eventId: "E-OUT", date: "2026-10-02", materialId: "M-PRODUCT", eventType: "제조완성", quantity: 500, unit: "ml" },
      ],
    });

    const inventory = calculateInventory(data);
    expect(inventory.find((row) => row.materialId === "M-BASE")?.current).toBe(800);
    expect(inventory.find((row) => row.materialId === "M-PRODUCT")?.current).toBe(500);
  });

  it("C. 칵테일 세 잔 판매는 레시피 사용량을 한 번만 차감한다", () => {
    const data = dataset({
      materials: [material("M-GIN", "진")],
      menus: [{ menuId: "DRINK-1", name: "진 토닉", price: 12_000, category: "칵테일", recipeVersion: "v1" }],
      recipes: [{ recipeVersion: "v1", menuId: "DRINK-1", materialId: "M-GIN", quantity: 30, unit: "ml" }],
      openingInventory: [{ materialId: "M-GIN", date: "2026-10-01", quantity: 1_000, unit: "ml" }],
      sales: [{ saleId: "SALE-1", date: "2026-10-02", menuId: "DRINK-1", channel: "매장", quantity: 3, recipeVersion: "v1" }],
    });

    expect(calculateInventory(data)[0].current).toBe(910);
  });

  it("D. 과거 판매 손익은 이후 구매가격이 바뀌어도 저장된 원가를 유지한다", () => {
    const base = dataset({
      materials: [material("M-GIN", "진")],
      menus: [{ menuId: "DRINK-1", name: "진 토닉", price: 12_000, category: "칵테일", recipeVersion: "v1" }],
      recipes: [{ recipeVersion: "v1", menuId: "DRINK-1", materialId: "M-GIN", quantity: 100, unit: "ml" }],
      priceHistory: [{ materialId: "M-GIN", effectiveDate: "2026-10-01", packPrice: 10_000, packQuantity: 1_000 }],
    });
    const snapshot = calculateSaleSnapshot(base, { date: "2026-10-02", menuId: "DRINK-1", channel: "매장", quantity: 2, netSales: 20_000 });
    const savedSale: DataRow = {
      saleId: "SALE-1",
      date: "2026-10-02",
      menuId: "DRINK-1",
      channel: "매장",
      quantity: 2,
      netSales: 20_000,
      discountAmount: snapshot.discountAmount,
      paymentFee: snapshot.paymentFee,
      recipeVersion: "v1",
      unitFoodCostSnapshot: snapshot.unitFoodCost,
      unitPackagingCostSnapshot: snapshot.unitPackagingCost,
    };
    const repriced = { ...base, priceHistory: [{ materialId: "M-GIN", effectiveDate: "2026-10-03", packPrice: 50_000, packQuantity: 1_000 }] };

    expect(aggregateProfitability(repriced, [savedSale], "전체")[0].contribution).toBe(17_700);
  });

  it("G. 실사조정은 증감량이 아니라 그날 확인한 실제 잔량을 기준점으로 사용한다", () => {
    const data = dataset({
      materials: [material("M-GIN", "진")],
      openingInventory: [{ materialId: "M-GIN", date: "2026-10-01", quantity: 100, unit: "ml" }],
      inventoryEvents: [
        { eventId: "COUNT-1", date: "2026-10-02", materialId: "M-GIN", eventType: "실사조정", quantity: -30, countedQuantity: 70, unit: "ml" },
        { eventId: "RECEIPT-1", date: "2026-10-03", materialId: "M-GIN", eventType: "입고", quantity: 10, unit: "ml" },
      ],
    });

    expect(calculateInventory(data)[0].current).toBe(80);
  });
});

describe("다음 단계에서 구현 후 활성화할 운영 검사", () => {
  it.todo("E. 지난달 구매 원장 재업로드는 중복 반영되지 않는다");
  it.todo("F. 같은 요청을 반복 전송해도 재고 이동은 한 번만 기록된다");
  it.todo("I. 판매 취소는 원판매를 보존하고 반대 방향 조정 기록을 만든다");
});
