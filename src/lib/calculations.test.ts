import { beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { aggregateProfitability, calculateActualPnl, calculateInventory, calculateSaleSnapshot, forecastPnl, periodFor } from "./calculations";
import { normalizeExternalJson } from "./data/normalize";
import { validateDataset } from "./data/schema";
import type { CafeDataset } from "./data/types";

let data: CafeDataset;
beforeAll(() => {
  const raw = JSON.parse(readFileSync("public/sample/prep-cafe-v3.1.json", "utf8"));
  const checked = validateDataset(normalizeExternalJson(raw));
  if (!checked.data) throw new Error("샘플 검증 실패");
  data = checked.data;
});

describe("판매와 기간 계산", () => {
  it("FRD 판매 예시의 정상가격·할인·수수료를 계산한다", () => {
    const result = calculateSaleSnapshot(data, { date: "2026-09-18", menuId: "M02", channel: "포장", quantity: 15, netSales: 70000 });
    expect(result.normalSales).toBe(72000);
    expect(result.discountAmount).toBe(2000);
    expect(result.paymentFee).toBe(1050);
    expect(result.unitPackagingCost).toBeGreaterThan(0);
  });
  it("0원 판매의 이익률은 계산하지 않는다", () => expect(calculateSaleSnapshot(data, { date: "2026-09-18", menuId: "M01", channel: "매장", quantity: 1, netSales: 0 }).contributionRate).toBeNull());
  it("주는 월요일부터 일요일, 월은 달력 범위다", () => {
    expect(periodFor("week", "2026-09-18")).toEqual({ start: "2026-09-14", end: "2026-09-20" });
    expect(periodFor("month", "2026-09-18")).toEqual({ start: "2026-09-01", end: "2026-09-30" });
  });
});

describe("집계 계산", () => {
  it("메뉴 수익성을 공헌이익 순으로 정렬한다", () => {
    const rows = aggregateProfitability(data, data.sales.filter((row) => String(row.date).startsWith("2026-09")), "전체");
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].contribution).toBeGreaterThanOrEqual(rows[1].contribution);
  });
  it("재고와 부족·발주 참고량을 계산한다", () => {
    const rows = calculateInventory(data);
    expect(rows).toHaveLength(11);
    expect(rows.some((row) => row.shortage && row.orderQuantity !== null)).toBe(true);
    expect(rows.every((row) => row.dailyUsage === null || Number.isFinite(row.dailyUsage))).toBe(true);
  });
  it("마감 실적과 남은 기간 예상 손익을 구분한다", () => {
    const period = periodFor("month", "2026-09-18");
    const actual = calculateActualPnl(data, period);
    const forecast = forecastPnl(data, period, actual);
    expect(actual.includedEnd).toBe("2026-09-18");
    expect(actual.confirmed.netSales).toBeGreaterThan(0);
    expect(forecast.available).toBe(true);
    expect(forecast.historyDays).toBe(28);
    expect(forecast.remainingOpenDays).toBeGreaterThan(0);
  });
});
