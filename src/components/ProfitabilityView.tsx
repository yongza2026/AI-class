"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, Plus } from "lucide-react";
import { aggregateMenuProfitability, inPeriod, periodFor, type ProfitRow } from "@/lib/calculations";
import { readDataset } from "@/lib/data/database";
import type { CafeDataset } from "@/lib/data/types";
import { rate, valueOf, won } from "@/lib/format";
import { displayMenuCategory } from "@/lib/menuCategories";
import { PeriodFilters } from "./PeriodFilters";
import { useSalesWorkspaceFilters } from "./useSalesWorkspaceFilters";

type CategoryGroup = { category: string; rows: ProfitRow[]; menuCount: number; quantity: number; netSales: number; contribution: number; contributionRate: number | null };

export function ProfitabilityView() {
  const [data, setData] = useState<CafeDataset | null>(null);
  const { filters, updateFilters, hrefFor } = useSalesWorkspaceFilters();
  useEffect(() => { let ignore = false; readDataset().then((next) => { if (!ignore) setData(next); }); return () => { ignore = true; }; }, []);
  useEffect(() => { if (data && !filters.date) updateFilters({ date: data.meta.asOf }); }, [data, filters.date, updateFilters]);

  const date = filters.date || data?.meta.asOf || "";
  const period = date ? periodFor(filters.unit, date) : { start: "", end: "" };
  const { start, end } = period;
  const baseRows = useMemo(() => {
    if (!data) return [];
    const q = filters.query.trim().toLowerCase();
    const sales = data.sales.filter((row) => inPeriod(valueOf(row, "date"), { start, end }) && (!filters.menu || row.menuId === filters.menu));
    return aggregateMenuProfitability(data, sales).filter((row) => {
      const menu = data.menus.find((item) => item.menuId === row.menuId) ?? {};
      const category = displayMenuCategory(menu);
      return !q || row.menuName.toLowerCase().includes(q) || row.menuId.toLowerCase().includes(q) || category.toLowerCase().includes(q);
    });
  }, [data, start, end, filters.menu, filters.query]);

  const categoryGroups = useMemo<CategoryGroup[]>(() => {
    if (!data) return [];
    const grouped = new Map<string, ProfitRow[]>();
    for (const row of baseRows) {
      const menu = data.menus.find((item) => item.menuId === row.menuId) ?? {};
      const category = displayMenuCategory(menu);
      grouped.set(category, [...(grouped.get(category) ?? []), row]);
    }
    return [...grouped.entries()].map(([category, rows]) => {
      const quantity = rows.reduce((sum, row) => sum + row.quantity, 0);
      const netSales = rows.reduce((sum, row) => sum + row.netSales, 0);
      const contribution = rows.reduce((sum, row) => sum + row.contribution, 0);
      return { category, rows, menuCount: rows.length, quantity, netSales, contribution, contributionRate: netSales === 0 ? null : contribution / netSales * 100 };
    }).sort((a, b) => b.contribution - a.contribution || a.category.localeCompare(b.category, "ko"));
  }, [baseRows, data]);

  const visibleGroups = filters.category ? categoryGroups.filter((group) => group.category === filters.category) : categoryGroups;
  const visibleRows = visibleGroups.flatMap((group) => group.rows);
  const totals = visibleRows.reduce((sum, row) => ({ sales: sum.sales + row.netSales, cost: sum.cost + row.foodCost + row.packagingCost, fee: sum.fee + row.fees, profit: sum.profit + row.contribution }), { sales: 0, cost: 0, fee: 0, profit: 0 });

  if (!data) return <section className="page"><div className="empty-card">데이터 관리에서 자료를 먼저 준비해 주세요.</div></section>;

  return <section className="page">
    <div className="page-heading"><div><p className="eyebrow">카테고리 · 메뉴 수익성</p><h1>판매 수익성 한눈에 보기</h1><p>카테고리 전체 성과를 먼저 보고, 아래에서 개별 메뉴를 확인할 수 있습니다.</p></div><Link className="button primary" href={hrefFor("/sales/new")}><Plus size={16} />판매 입력</Link></div>
    <PeriodFilters unit={filters.unit} date={date} onUnit={(unit) => updateFilters({ unit })} onDate={(nextDate) => updateFilters({ date: nextDate })} extra={<><label>메뉴 분류<select value={filters.category} onChange={(event) => updateFilters({ category: event.target.value, menu: "" })}><option value="">전체</option>{categoryGroups.map((group) => <option key={group.category}>{group.category}</option>)}</select></label><label className="grow">메뉴 검색<input value={filters.query} onChange={(event) => updateFilters({ query: event.target.value })} placeholder="메뉴명, 분류 또는 메뉴 ID" /></label></>} />
    {filters.menu && <div className="notice info"><span>선택 메뉴: <strong>{valueOf(data.menus.find((row) => row.menuId === filters.menu) ?? {}, "name") || filters.menu}</strong></span><button className="button secondary compact" onClick={() => updateFilters({ menu: "" })}>전체 메뉴 보기</button></div>}
    <div className="metric-grid"><Metric label="실 결제금액" value={won(totals.sales)} /><Metric label="직접원가" value={won(totals.cost)} /><Metric label="결제수수료" value={won(totals.fee)} /><Metric label="공헌이익" value={won(totals.profit)} /></div>

    {categoryGroups.length > 0 && <div className="category-overview" aria-label="메뉴 분류별 요약">
      <button className={`category-summary-card ${filters.category ? "" : "active"}`} onClick={() => updateFilters({ category: "", menu: "" })}><span>전체 메뉴</span><strong>{baseRows.reduce((sum, row) => sum + row.quantity, 0).toLocaleString()}개</strong><small>{baseRows.length}개 메뉴 · {won(baseRows.reduce((sum, row) => sum + row.netSales, 0))}</small></button>
      {categoryGroups.map((group) => <button key={group.category} className={`category-summary-card ${filters.category === group.category ? "active" : ""}`} onClick={() => updateFilters({ category: group.category, menu: "" })}><span>{group.category}</span><strong>{group.quantity.toLocaleString()}개</strong><small>{group.menuCount}개 메뉴 · {won(group.netSales)}</small><em>공헌이익 {won(group.contribution)} · {rate(group.contributionRate)}</em></button>)}
    </div>}

    <div className="category-profit-groups">
      {visibleGroups.map((group) => <details className="category-profit-group" key={group.category} open>
        <summary><div><span className="category-badge">{group.category}</span><strong>{group.quantity.toLocaleString()}개 판매</strong><small>{group.menuCount}개 메뉴</small></div><div className="category-profit-totals"><span>매출 <strong>{won(group.netSales)}</strong></span><span>공헌이익 <strong>{won(group.contribution)}</strong></span><span>이익률 <strong>{rate(group.contributionRate)}</strong></span><ChevronDown size={18} /></div></summary>
        <div className="table-wrap"><table className="data-table profitability-table"><thead><tr><th>순위</th><th>메뉴</th><th className="num">판매수량</th><th className="num">실 결제</th><th className="num">식재료비</th><th className="num">포장비</th><th className="num">수수료</th><th className="num">공헌이익</th><th className="num">이익률</th><th>상태</th></tr></thead><tbody>{group.rows.map((row, index) => <tr key={row.menuId}><td>{index + 1}</td><td><Link href={hrefFor("/sales", { menu: row.menuId, query: "" })} className="table-link"><strong>{row.menuName}</strong><small>{row.menuId}</small></Link></td><td className="num">{row.quantity.toLocaleString()}</td><td className="num">{won(row.netSales)}</td><td className="num">{won(row.foodCost)}</td><td className="num">{won(row.packagingCost)}</td><td className="num">{won(row.fees)}</td><td className="num"><strong>{won(row.contribution)}</strong></td><td className="num">{rate(row.rate)}</td><td><span className={`badge ${row.rate !== null && row.rate >= 70 ? "verified" : "pending"}`}>{row.status}</span></td></tr>)}</tbody></table></div>
      </details>)}
      {!visibleRows.length && <div className="empty-card"><h2>선택한 조건의 판매가 없습니다</h2><p>기간, 메뉴 분류 또는 검색어를 바꿔 보세요.</p></div>}
    </div>
  </section>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="metric-card"><span>{label}</span><strong>{value}</strong></div>; }
