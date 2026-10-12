"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Box, ReceiptText, TrendingUp, WalletCards } from "lucide-react";
import { aggregateProfitability, calculateActualPnl, calculateInventory, forecastPnl, inPeriod, periodFor, type PeriodUnit } from "@/lib/calculations";
import { readDataset } from "@/lib/data/database";
import type { CafeDataset, DataRow } from "@/lib/data/types";
import { numberOf, qty, rate, valueOf, won } from "@/lib/format";
import { PeriodFilters } from "./PeriodFilters";

export function Dashboard() {
  const [data, setData] = useState<CafeDataset | null>(null);
  const [unit, setUnit] = useState<PeriodUnit>("month");
  const [date, setDate] = useState("");
  useEffect(() => {
    let ignore = false;
    readDataset().then((next) => { if (!ignore) { setData(next); if (next) setDate(next.meta.asOf); } });
    return () => { ignore = true; };
  }, []);
  const { start, end } = date ? periodFor(unit, date) : { start: "", end: "" };
  const calculations = useMemo(() => {
    if (!data) return null;
    const period = { start, end };
    const sales = data.sales.filter((row) => inPeriod(valueOf(row, "date"), period));
    const actual = calculateActualPnl(data, period);
    const forecast = forecastPnl(data, period, actual);
    const inventory = calculateInventory(data);
    const profits = aggregateProfitability(data, sales, "전체");
    const channels = ["매장", "포장"].map((channel) => ({ channel, value: sales.filter((row) => row.channel === channel).reduce((sum, row) => sum + numberOf(row, "netSales"), 0) }));
    const dates = [...new Set(sales.map((row) => valueOf(row, "date")))].sort();
    const trend = dates.map((day) => {
      const daily = sales.filter((row) => row.date === day);
      return { day, net: daily.reduce((sum, row) => sum + numberOf(row, "netSales"), 0), contribution: daily.reduce((sum, row) => sum + numberOf(row, "netSales") - numberOf(row, "quantity") * (numberOf(row, "unitFoodCostSnapshot") + numberOf(row, "unitPackagingCostSnapshot")) - numberOf(row, "paymentFee"), 0) };
    });
    const recent = [
      ...data.sales.slice(-3).map((row) => ({ ...row, kind: "판매" })),
      ...data.expenses.slice(-3).map((row) => ({ ...row, kind: "비용" })),
      ...data.inventoryEvents.slice(-3).map((row) => ({ ...row, kind: "재고" })),
    ].sort((a, b) => valueOf(b, "date").localeCompare(valueOf(a, "date"))).slice(0, 6);
    return { actual, forecast, inventory, profits, channels, trend, recent };
  }, [data, start, end]);

  if (!data) return <section className="page"><div className="empty-card"><h2>운영자료가 없습니다</h2><p>샘플이나 엑셀 자료를 먼저 준비해 주세요.</p><Link className="button primary" href="/data">데이터 관리</Link></div></section>;
  if (!calculations) return null;
  const { actual, forecast, inventory, profits, channels, trend, recent } = calculations;
  const maxTrend = Math.max(1, ...trend.map((item) => item.net));
  const shortages = inventory.filter((row) => row.shortage);
  return <section className="page">
    <div className="page-heading"><div><p className="eyebrow">대시보드 & 손익</p><h1>운영 현황</h1><p>{start} ~ {end} · 실제 포함 {actual.includedStart ?? "없음"} ~ {actual.includedEnd ?? "없음"}</p></div><div className="actions"><Link className="button secondary" href="/expenses">비용 기록</Link><Link className="button secondary" href="/inventory/new">재고 기록</Link><Link className="button primary" href="/sales/new">판매 입력</Link></div></div>
    <PeriodFilters unit={unit} date={date} onUnit={setUnit} onDate={setDate}/>
    <div className="status-row"><span className="badge verified">확정 실적 {won(actual.confirmed.netSales)}</span>{actual.pending.netSales > 0 && <span className="badge pending">잠정 실적 {won(actual.pending.netSales)}</span>}{forecast.available && <span className="badge forecast">예상 포함 · 남은 영업일 {forecast.remainingOpenDays}일</span>}</div>
    <div className="metric-grid"><Metric icon={ReceiptText} label="실 결제금액" value={won(actual.total.netSales)} sub={`직접원가 ${won(actual.total.directCost)}`}/><Metric icon={TrendingUp} label="공헌이익" value={won(actual.total.contribution)} sub={`결제수수료 ${won(actual.total.fees)}`}/><Metric icon={WalletCards} label="영업손익" value={won(actual.total.operatingProfit)} sub={`실제 운영비 ${won(actual.total.expenses)} · ${rate(actual.total.operatingRate)}`}/><Metric icon={Box} label={forecast.available ? "기간 예상 영업손익" : "부족 재료"} value={forecast.available ? won(forecast.projectedOperatingProfit) : `${shortages.length}개`} sub={forecast.available ? `과거 ${forecast.historyDays}일 기준 · ${rate(forecast.projectedRate)}` : "발주 참고량 확인 필요"}/></div>
    {!forecast.available && <div className="notice info"><div><strong>예상 손익 안내</strong><span>{forecast.reason}</span></div></div>}
    <div className="dashboard-grid"><div className="card"><div className="card-title"><div><h2>매출·공헌이익 추이</h2><p>저장된 실제 판매 기준</p></div></div>{trend.length ? <div className="bar-chart" aria-label="일별 매출 추이">{trend.slice(-31).map((item) => <div className="bar-item" key={item.day} title={`${item.day} 매출 ${won(item.net)}, 공헌이익 ${won(item.contribution)}`}><div className="bar" style={{ height: `${Math.max(4, item.net / maxTrend * 100)}%` }}/><span>{item.day.slice(8)}</span></div>)}</div> : <div className="table-empty">선택 기간의 판매 기록이 없습니다.</div>}</div>
      <div className="card"><h2>채널별 매출</h2><div className="channel-summary">{channels.map((item) => { const total = channels.reduce((sum, channel) => sum + channel.value, 0); return <div key={item.channel}><div><span>{item.channel}</span><strong>{won(item.value)}</strong></div><div className="progress"><i style={{ width: `${total ? item.value / total * 100 : 0}%` }}/></div><small>{total ? `${(item.value / total * 100).toFixed(1)}%` : "0.0%"}</small></div>; })}</div><h2 className="section-title">수익 기여 상위 메뉴</h2><div className="rank-list">{profits.slice(0, 5).map((row, index) => <div key={`${row.menuId}-${row.channel}`}><span>{index + 1}</span><p><strong>{row.menuName}</strong><small>{row.channel}</small></p><b>{won(row.contribution)}</b></div>)}</div></div></div>
    <div className="dashboard-grid lower"><div className="card"><div className="card-title"><div><h2>부족 재료</h2><p>최근 28개 마감 영업일 사용량 기준</p></div><Link href="/inventory">전체 보기 <ArrowRight size={14}/></Link></div>{shortages.length ? <div className="shortage-list">{shortages.slice(0, 6).map((row) => <Link key={row.materialId} href={`/inventory?material=${row.materialId}`}><AlertTriangle size={16}/><p><strong>{row.name}</strong><small>현재 {qty(row.current, row.unit)} · 목표 {row.target === null ? "계산 불가" : qty(row.target, row.unit)}</small></p><b>{row.orderQuantity === null ? "계산 불가" : `${qty(row.orderQuantity, row.unit)} 발주 참고`}</b></Link>)}</div> : <div className="table-empty">부족 상태인 재료가 없습니다.</div>}</div>
      <div className="card"><h2>최근 기록</h2><div className="recent-list">{recent.map((row, index) => <div key={`${row.kind}-${index}`}><span className="badge pending">{row.kind}</span><p><strong>{recentTitle(row, data)}</strong><small>{valueOf(row, "date")} · {valueOf(row, "saleId") || valueOf(row, "expenseId") || valueOf(row, "eventId")}</small></p></div>)}</div></div></div>
  </section>;
}

function Metric({ icon: Icon, label, value, sub }: { icon: typeof ReceiptText; label: string; value: string; sub: string }) { return <div className="metric-card"><Icon size={18}/><span>{label}</span><strong>{value}</strong><small>{sub}</small></div>; }
function recentTitle(row: DataRow & { kind: string }, data: CafeDataset) { if (row.kind === "판매") return `${valueOf(data.menus.find((menu) => menu.menuId === row.menuId) ?? {}, "name")} ${numberOf(row, "quantity")}개`; if (row.kind === "비용") return `${row.category} ${won(numberOf(row, "amount"))}`; return `${valueOf(data.materials.find((material) => material.materialId === row.materialId) ?? {}, "name")} ${row.eventType}`; }
