"use client";

import { useMemo } from "react";
import { monthlyPerformance, type MonthlyPerformance as MonthRow, type MonthlySalesPeriod } from "@/lib/monthlyPerformance";
import type { CafeDataset } from "@/lib/data/types";
import { won } from "@/lib/format";

const signedRate = (value: number | null) => value == null ? "—" : `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
const amount = (value: number | null) => value == null ? "자료 없음" : won(value);
const periodLabel = (period: MonthlySalesPeriod) => `${period.start} ~ ${period.end}`;
const growthClass = (row: MonthRow) => row.growthRate == null ? "" : row.growthRate >= 0 ? "growth-positive" : "growth-negative";

export function MonthlyPerformance({ data, referenceDate }: { data: CafeDataset; referenceDate: string }) {
  const rows = useMemo(() => monthlyPerformance(data, referenceDate), [data, referenceDate]);
  const selected = rows.at(-1);
  if (!selected) return null;
  const max = Math.max(1, ...rows.flatMap((row) => [row.current.netSales ?? 0, row.previous.netSales ?? 0]));
  return <section className="monthly-performance card" aria-labelledby="monthly-performance-title">
    <div className="monthly-performance-heading"><div><p className="eyebrow">월간 성과 · 같은 매장 비교</p><h2 id="monthly-performance-title">월별 매출과 전년 동월 성장률</h2><p>기준 날짜가 속한 달까지 최근 12개월 · {data.meta.storeName} · 자료 기준일 {data.meta.asOf}</p></div><span className={`badge ${selected.provisional ? "pending" : "verified"}`}>{selected.comparisonNote}</span></div>
    <div className="monthly-kpis">
      <div><span>{selected.month} {selected.partialMonth ? "누적 매출" : "매출"}</span><strong>{amount(selected.current.netSales)}</strong><small>{periodLabel(selected.current)}</small></div>
      <div><span>전년 동월 {selected.partialMonth ? "같은 기간" : "매출"}</span><strong>{amount(selected.previous.netSales)}</strong><small>{periodLabel(selected.previous)}</small></div>
      <div className={growthClass(selected)}><span>동일 매장 성장률{selected.growthRate != null && selected.provisional ? " · 잠정" : ""}</span><strong>{signedRate(selected.growthRate)}</strong><small>{selected.difference == null ? selected.comparisonNote : `매출 차이 ${selected.difference > 0 ? "+" : ""}${won(selected.difference)}`}</small></div>
    </div>
    <p className="monthly-period-note">진행 중인 달은 전년의 같은 날짜까지 비교합니다. 지난달들은 월 전체를 비교하며, 윤년의 2월은 전년 말일까지 맞춥니다. 매출은 할인 반영 후 실 결제금액이며 확정·잠정 기록을 포함합니다.</p>
    <div className="monthly-chart-legend"><span><i className="monthly-current-key"/>월 매출</span><span><i className="monthly-previous-key"/>전년 같은 달</span><span>빈 표시 = 자료 없음</span></div>
    <p className="monthly-scroll-hint">그래프와 표를 좌우로 밀면 나머지 월과 성장률을 볼 수 있습니다.</p>
    <div className="monthly-chart-scroll"><div className="monthly-chart" role="img" aria-label="최근 12개월 매출과 전년 동월 매출 막대 그래프. 정확한 금액과 비교 기간은 아래 표에서 확인할 수 있습니다.">
      {rows.map((row) => <div className={`monthly-chart-month ${row.month === selected.month ? "selected" : ""}`} key={row.month} title={`${row.month}: ${amount(row.current.netSales)}, 전년 ${amount(row.previous.netSales)}, 성장률 ${signedRate(row.growthRate)} · ${row.comparisonNote}`}><div className="monthly-chart-bars">{(["current", "previous"] as const).map((kind) => <div key={kind} className={`monthly-chart-bar ${kind} ${row[kind].netSales == null ? "missing" : ""}`} style={{ height: row[kind].netSales == null ? "4px" : `${Math.max(0, row[kind].netSales / max * 100)}%` }}/>)}</div><span>{row.month.slice(2).replace("-", "/")}</span>{row.partialMonth && <small>동일 기간</small>}</div>)}
    </div></div>
    <div className="table-wrap"><table className="data-table monthly-performance-table"><caption>월별 매출 상세 · 금액은 기존 매출과 같은 기준, 자료 없는 달은 0원으로 처리하지 않습니다.</caption><thead><tr><th>월 / 비교 범위</th><th className="num">매출</th><th className="num">전년 동월</th><th className="num">전년 대비</th><th>기록 상태</th></tr></thead><tbody>{rows.map((row) => <tr key={row.month} className={row.month === selected.month ? "monthly-selected-row" : ""}><td><strong>{row.month}</strong><small>{row.partialMonth ? `1~${Number(row.current.end.slice(8))}일 누적` : "월 전체"}</small></td><td className="num">{amount(row.current.netSales)}</td><td className="num">{amount(row.previous.netSales)}<small>{row.previous.start.slice(0, 7)} · 1~{Number(row.previous.end.slice(8))}일</small></td><td className={`num ${growthClass(row)}`}>{signedRate(row.growthRate)}{row.growthRate != null && row.provisional && <small>잠정</small>}</td><td>{row.comparisonNote}<small>현재 마감·휴무 {row.current.completeDays}/{row.current.totalDays}일 · 전년 {row.previous.completeDays}/{row.previous.totalDays}일</small></td></tr>)}</tbody></table></div>
    <p className="monthly-data-note">같은 매장의 기록만 비교합니다. 가격 인상, 휴무일 수, 날씨 등의 영향은 자동 보정하지 않습니다. 전년 자료가 없거나 전년 매출이 0원이면 성장률을 계산하지 않습니다. 미마감 기록이 있으면 잠정 수치입니다.</p>
  </section>;
}
