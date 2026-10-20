import { describe, expect, it } from "vitest";
import { groupSalesByDayAndMenu } from "./salesRecords";

describe("판매 기록 일별 메뉴 묶음", () => {
  it("같은 날짜와 메뉴의 여러 기록을 한 줄 합계로 묶는다", () => {
    const rows = groupSalesByDayAndMenu([
      { saleId: "S2", date: "2026-09-18", menuId: "M05", quantity: 4, unitPrice: 5800, discountAmount: 0, netSales: 23200, paymentFee: 348 },
      { saleId: "S1", date: "2026-09-18", menuId: "M05", quantity: 3, unitPrice: 5800, discountAmount: 0, netSales: 17400, paymentFee: 261 },
      { saleId: "S3", date: "2026-09-18", menuId: "M04", quantity: 6, unitPrice: 5500, discountAmount: 0, netSales: 33000, paymentFee: 495 },
    ]);
    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.menuId === "M05")).toMatchObject({ quantity: 7, normalSales: 40600, netSales: 40600, fees: 609 });
    expect(rows.find((row) => row.menuId === "M05")?.records).toHaveLength(2);
  });
});
