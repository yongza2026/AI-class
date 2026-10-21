import Decimal from "decimal.js";
import type { CafeDataset } from "./data/types";

export type SalesCoverage = "complete" | "partial" | "missing" | "future";
export type MonthlySalesPeriod = {
  start: string;
  end: string;
  netSales: number | null;
  coverage: SalesCoverage;
  completeDays: number;
  totalDays: number;
};
export type MonthlyPerformance = {
  month: string;
  current: MonthlySalesPeriod;
  previous: MonthlySalesPeriod;
  growthRate: number | null;
  difference: number | null;
  provisional: boolean;
  comparisonNote: string;
  partialMonth: boolean;
};

const pad = (n: number) => String(n).padStart(2, "0");
const monthKey = (year: number, month: number) => `${year}-${pad(month)}`;
const monthDays = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();

/** 현재 매장 자료만 집계한다. 판매 행 수를 손님 수나 결제 건수로 해석하지 않는다. */
export function monthlyPerformance(data: CafeDataset, referenceDate: string, count = 12): MonthlyPerformance[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(referenceDate) || !Number.isInteger(count) || count < 1 || count > 60) return [];
  const [referenceYear, referenceMonth] = referenceDate.split("-").map(Number);
  if (referenceMonth < 1 || referenceMonth > 12) return [];
  const cutoff = referenceDate < data.meta.asOf ? referenceDate : data.meta.asOf;
  const daily = new Map<string, Decimal>();
  for (const sale of data.sales) {
    const date = String(sale.date ?? "");
    daily.set(date, (daily.get(date) ?? new Decimal(0)).add(Number(sale.netSales ?? 0)));
  }
  const calendar = new Map(data.calendar.map((day) => [String(day.date), day]));

  function summarize(start: string, end: string, future = false): MonthlySalesPeriod {
    if (future) return { start, end, netSales: null, coverage: "future", completeDays: 0, totalDays: 0 };
    const [year, month, firstDay] = start.split("-").map(Number);
    const lastDay = Number(end.slice(8, 10));
    let total = new Decimal(0);
    let salesDays = 0;
    let completeDays = 0;
    for (let day = firstDay; day <= lastDay; day += 1) {
      const date = `${monthKey(year, month)}-${pad(day)}`;
      const hasSales = daily.has(date);
      if (hasSales) { total = total.add(daily.get(date)!); salesDays += 1; }
      const entry = calendar.get(date);
      // 마감 또는 판매 없는 휴무일만 확인된 날로 센다.
      if (entry?.recordComplete === true || (entry?.isOpen === false && !hasSales)) completeDays += 1;
    }
    const totalDays = lastDay - firstDay + 1;
    const complete = completeDays === totalDays && start >= data.meta.startDate;
    const available = complete || salesDays > 0;
    return { start, end, netSales: available ? total.toNumber() : null, coverage: complete ? "complete" : available ? "partial" : "missing", completeDays, totalDays };
  }

  return Array.from({ length: count }, (_, index) => {
    const serial = referenceYear * 12 + referenceMonth - 1 - (count - 1 - index);
    const year = Math.floor(serial / 12);
    const month = serial % 12 + 1;
    const key = monthKey(year, month);
    const start = `${key}-01`;
    const fullEnd = `${key}-${pad(monthDays(year, month))}`;
    const future = start > cutoff;
    const end = !future && cutoff < fullEnd ? cutoff : fullEnd;
    const partialMonth = !future && end < fullEnd;
    const previousKey = monthKey(year - 1, month);
    const previousLastDay = partialMonth ? Math.min(Number(end.slice(8)), monthDays(year - 1, month)) : monthDays(year - 1, month);
    const current = summarize(start, end, future);
    const previous = summarize(`${previousKey}-01`, `${previousKey}-${pad(previousLastDay)}`);
    const difference = current.netSales != null && previous.netSales != null ? new Decimal(current.netSales).sub(previous.netSales).toNumber() : null;
    const growthRate = difference != null && previous.netSales! > 0 ? new Decimal(difference).div(previous.netSales!).mul(100).toNumber() : null;
    const provisional = current.coverage !== "complete" || previous.coverage !== "complete";
    const comparisonNote = future ? "조회 기준일 이후" : current.netSales == null ? "현재 자료 없음" : previous.netSales == null ? "전년 자료 없음" : previous.netSales === 0 ? "전년 매출 0원 · 비율 계산 불가" : provisional ? "잠정 · 미마감 또는 기간 일부 자료" : "확정";
    return { month: key, current, previous, growthRate, difference, provisional, comparisonNote, partialMonth };
  });
}
