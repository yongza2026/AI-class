import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { monthlyPerformance } from "./monthlyPerformance";
import { emptyDataset } from "./data/migration";
import { normalizeExternalJson } from "./data/normalize";
import type { CafeDataset } from "./data/types";

function fixture(asOf = "2026-10-31") {
  const data = emptyDataset("2025-01-01");
  data.meta.asOf = asOf;
  return data;
}
function closeMonth(data: CafeDataset, month: string, through?: number) {
  const [year, m] = month.split("-").map(Number);
  const last = through ?? new Date(Date.UTC(year, m, 0)).getUTCDate();
  for (let day = 1; day <= last; day += 1) data.calendar.push({ date: `${month}-${String(day).padStart(2, "0")}`, isOpen: true, recordComplete: true });
}
function sale(data: CafeDataset, date: string, netSales: number) { data.sales.push({ date, netSales }); }

describe("월별 매출과 전년 동월 비교", () => {
  it("같은 달 판매를 합산해 전년 100만원에서 올해 120만원이면 +20%로 계산한다", () => {
    const data = fixture(); closeMonth(data, "2025-10"); closeMonth(data, "2026-10");
    sale(data, "2025-10-01", 1_000_000); sale(data, "2026-10-01", 800_000); sale(data, "2026-10-01", 400_000);
    const row = monthlyPerformance(data, "2026-10-31").at(-1)!;
    expect(row.current.netSales).toBe(1_200_000);
    expect(row.previous.netSales).toBe(1_000_000);
    expect(row.growthRate).toBe(20); expect(row.difference).toBe(200_000);
    expect(row.provisional).toBe(false);
  });
  it("진행 중인 달은 같은 날짜까지 비교하고 이후 판매는 제외한다", () => {
    const data = fixture("2026-10-18"); closeMonth(data, "2025-10", 18); closeMonth(data, "2026-10", 18);
    sale(data, "2025-10-18", 100); sale(data, "2025-10-19", 900); sale(data, "2026-10-18", 120); sale(data, "2026-10-19", 10000);
    const row = monthlyPerformance(data, "2026-10-31").at(-1)!;
    expect(row.current.end).toBe("2026-10-18"); expect(row.previous.end).toBe("2025-10-18");
    expect(row.growthRate).toBe(20); expect(row.partialMonth).toBe(true);
  });
  it("기준 날짜와 자료 기준일 중 더 이른 날까지만 집계한다", () => {
    const data = fixture("2026-10-18"); sale(data, "2026-10-10", 100); sale(data, "2026-10-11", 200);
    expect(monthlyPerformance(data, "2026-10-10").at(-1)?.current.netSales).toBe(100);
  });
  it("전년 자료 부재를 0원 또는 -100%로 표시하지 않는다", () => {
    const data = fixture(); sale(data, "2026-10-01", 500);
    const row = monthlyPerformance(data, "2026-10-31").at(-1)!;
    expect(row.previous.netSales).toBeNull(); expect(row.growthRate).toBeNull();
    expect(row.comparisonNote).toBe("전년 자료 없음");
  });
  it("현재 자료가 없으면 전년 판매가 있어도 -100%를 만들지 않는다", () => {
    const data = fixture(); sale(data, "2025-10-01", 500);
    const row = monthlyPerformance(data, "2026-10-31").at(-1)!;
    expect(row.current.netSales).toBeNull(); expect(row.growthRate).toBeNull();
    expect(row.comparisonNote).toBe("현재 자료 없음");
  });
  it("0원으로 마감된 달은 실제 0원이며 전년 0원에는 비율을 만들지 않는다", () => {
    const data = fixture(); closeMonth(data, "2025-10"); closeMonth(data, "2026-10"); sale(data, "2026-10-01", 500);
    const row = monthlyPerformance(data, "2026-10-31").at(-1)!;
    expect(row.previous.netSales).toBe(0); expect(row.growthRate).toBeNull(); expect(row.difference).toBe(500);
    expect(row.comparisonNote).toContain("전년 매출 0원");
    data.sales = [{ date: "2025-10-01", netSales: 500 }];
    expect(monthlyPerformance(data, "2026-10-31").at(-1)?.growthRate).toBe(-100);
  });
  it("기록이 있으나 마감 또는 영업일 정보가 부족하면 잠정 표시한다", () => {
    const data = fixture(); sale(data, "2025-10-01", 100); sale(data, "2026-10-01", 90);
    const row = monthlyPerformance(data, "2026-10-31").at(-1)!;
    expect(row.growthRate).toBe(-10); expect(row.provisional).toBe(true); expect(row.current.completeDays).toBe(0);
  });
  it("휴무일은 판매가 없을 때 확인된 날로 보고 휴무일 판매가 있으면 마감을 요구한다", () => {
    const data = fixture(); closeMonth(data, "2026-10"); data.calendar[0] = { date: "2026-10-01", isOpen: false, recordComplete: false };
    expect(monthlyPerformance(data, "2026-10-31").at(-1)?.current.coverage).toBe("complete");
    sale(data, "2026-10-01", 100);
    expect(monthlyPerformance(data, "2026-10-31").at(-1)?.current.coverage).toBe("partial");
  });
  it("윤년 2월은 전년 마지막 날로 맞추고 연도 경계를 넘는 12개월을 순서대로 만든다", () => {
    const data = fixture("2024-02-29"); data.meta.startDate = "2023-01-01";
    const rows = monthlyPerformance(data, "2024-02-29");
    expect(rows).toHaveLength(12); expect(rows[0].month).toBe("2023-03");
    expect(rows.at(-1)?.previous.end).toBe("2023-02-28"); expect(rows.at(-1)?.current.end).toBe("2024-02-29");
    data.meta.asOf = "2025-02-28";
    expect(monthlyPerformance(data, "2025-02-28").at(-1)?.previous.end).toBe("2024-02-29");
  });
  it("미래 달과 자료 시작일 이전은 확정 매출로 오인하지 않는다", () => {
    const data = fixture("2026-09-18");
    const future = monthlyPerformance(data, "2026-10-31").at(-1)!;
    expect(future.current.coverage).toBe("future"); expect(future.current.netSales).toBeNull();
    data.meta.startDate = "2026-09-15"; closeMonth(data, "2026-09", 18); sale(data, "2026-09-18", 100);
    expect(monthlyPerformance(data, "2026-09-18").at(-1)?.current.coverage).toBe("partial");
  });
  it("샘플의 월별 합계가 원본 판매 합계와 맞고 조회가 원본 자료를 바꾸지 않는다", () => {
    const data = normalizeExternalJson(JSON.parse(readFileSync("public/sample/prep-cafe-v3.1.json", "utf8"))) as CafeDataset;
    const before = JSON.stringify(data);
    const rows = monthlyPerformance(data, data.meta.asOf);
    const total = data.sales.filter((sale) => String(sale.date) >= rows[0].current.start && String(sale.date) <= data.meta.asOf).reduce((sum, sale) => sum + Number(sale.netSales), 0);
    expect(rows.reduce((sum, row) => sum + (row.current.netSales ?? 0), 0)).toBe(total);
    expect(rows.at(-1)?.previous.end).toBe("2025-09-18");
    expect(JSON.stringify(data)).toBe(before);
  });
});
