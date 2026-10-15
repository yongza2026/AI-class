import { describe, expect, it } from "vitest";
import { convertToBase, duplicateCandidates, packageReceipt, seoulToday, validateInventoryQuantity } from "./inventoryDomain";

describe("재고 업무 규칙", () => {
  it("700ml 3병을 2,100ml로 환산한다", () => expect(packageReceipt(3, 700, "ml", "ml")).toBe(2100));
  it("L↔ml, kg↔g만 자동 환산한다", () => {
    expect(convertToBase(1.5, "L", "ml")).toBe(1500);
    expect(convertToBase(2, "kg", "g")).toBe(2000);
    expect(() => convertToBase(1, "ml", "g")).toThrow("자동 환산");
  });
  it("분할을 허용하지 않는 낱개 품목의 소수를 막는다", () => expect(validateInventoryQuantity(0.5, { unit: "개", allowFraction: false })).toContain("소수"));
  it("규격이 다른 동명 품목은 합치지 않고 후보로 표시한다", () => {
    const rows = duplicateCandidates([{ name: "진", brand: "A", packageCapacity: 700 }], { name: "진", brand: "A", packageCapacity: 1000 });
    expect(rows).toHaveLength(1); expect(rows[0].exactSize).toBe(false);
  });
  it("서울 날짜를 YYYY-MM-DD로 만든다", () => expect(seoulToday(new Date("2026-10-14T15:30:00Z"))).toBe("2026-10-15"));
});
