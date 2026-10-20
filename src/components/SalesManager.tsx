"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";
import { calculateSaleSnapshot, inPeriod, periodFor } from "@/lib/calculations";
import { deleteRecord, readDataset, saveRecord } from "@/lib/data/database";
import type { CafeDataset, DataRow } from "@/lib/data/types";
import { numberOf, rate, valueOf, won } from "@/lib/format";
import { displayMenuCategory, menusByDisplayCategory } from "@/lib/menuCategories";
import { groupSalesByDayAndMenu } from "@/lib/salesRecords";
import { useCafeData } from "./DataProvider";
import { PeriodFilters } from "./PeriodFilters";
import { useSalesWorkspaceFilters } from "./useSalesWorkspaceFilters";

type Form = { saleId?: string; date: string; menuId: string; channel: "매장" | "포장"; quantity: number; netSales: number };

export function SalesManager({ startOpen = false }: { startOpen?: boolean }) {
  const { refresh } = useCafeData();
  const { filters, updateFilters, hrefFor } = useSalesWorkspaceFilters();
  const [data, setData] = useState<CafeDataset | null>(null);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<Form | null>(null);
  const [message, setMessage] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const load = useCallback(async () => setData(await readDataset()), []);

  useEffect(() => {
    let ignore = false;
    readDataset().then((next) => {
      if (ignore) return;
      setData(next);
      if (next && startOpen) {
        const menu = next.menus[0];
        setForm({ date: next.meta.asOf, menuId: valueOf(menu, "menuId"), channel: "매장", quantity: 1, netSales: numberOf(menu, "price") });
      }
    });
    return () => { ignore = true; };
  }, [startOpen]);

  useEffect(() => { if (data && !filters.date) updateFilters({ date: data.meta.asOf }); }, [data, filters.date, updateFilters]);

  const date = filters.date || data?.meta.asOf || "";
  const period = date ? periodFor(filters.unit, date) : { start: "", end: "" };
  const { start, end } = period;
  const menuGroups = useMemo(() => menusByDisplayCategory(data?.menus ?? []), [data]);
  const categories = menuGroups.map((group) => group.category);
  const records = useMemo(() => {
    if (!data) return [];
    const q = filters.query.trim().toLowerCase();
    return data.sales.filter((sale) => {
      const menu = data.menus.find((item) => item.menuId === sale.menuId) ?? {};
      const category = displayMenuCategory(menu);
      return inPeriod(valueOf(sale, "date"), { start, end })
        && (!filters.menu || sale.menuId === filters.menu)
        && (!filters.category || category === filters.category)
        && (!q || valueOf(sale, "saleId").toLowerCase().includes(q) || valueOf(menu, "name").toLowerCase().includes(q) || category.toLowerCase().includes(q));
    }).sort((a, b) => valueOf(b, "date").localeCompare(valueOf(a, "date")) || valueOf(b, "saleId").localeCompare(valueOf(a, "saleId")));
  }, [data, start, end, filters.category, filters.menu, filters.query]);

  const rows = useMemo(() => groupSalesByDayAndMenu(records), [records]);
  const pageRows = rows.slice((page - 1) * 20, page * 20);
  const totals = records.reduce<{ quantity: number; discount: number; net: number; fee: number }>((sum, row) => ({
    quantity: sum.quantity + numberOf(row, "quantity"), discount: sum.discount + numberOf(row, "discountAmount"), net: sum.net + numberOf(row, "netSales"), fee: sum.fee + numberOf(row, "paymentFee"),
  }), { quantity: 0, discount: 0, net: 0, fee: 0 });

  function openNew() {
    if (!data) return;
    const menu = data.menus[0];
    setForm({ date: data.meta.asOf, menuId: valueOf(menu, "menuId"), channel: "매장", quantity: 1, netSales: numberOf(menu, "price") });
    setMessage("");
  }

  const snapshot = useMemo(() => {
    if (!data || !form) return null;
    try { return calculateSaleSnapshot(data, form); } catch { return null; }
  }, [data, form]);

  function updateMenu(menuId: string) {
    if (!data || !form) return;
    const menu = data.menus.find((row) => row.menuId === menuId);
    setForm({ ...form, menuId, netSales: numberOf(menu ?? {}, "price") * form.quantity });
  }

  function updateQuantity(quantity: number) {
    if (!data || !form) return;
    const menu = data.menus.find((row) => row.menuId === form.menuId);
    setForm({ ...form, quantity, netSales: numberOf(menu ?? {}, "price") * quantity });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!data || !form) return;
    try {
      if (!form.date || !form.menuId) throw new Error("날짜와 메뉴를 입력해 주세요.");
      if (!Number.isInteger(form.quantity) || form.quantity < 1) throw new Error("판매수량은 1 이상의 정수여야 합니다.");
      if (form.netSales < 0) throw new Error("실 결제금액은 0 이상이어야 합니다.");
      const snap = calculateSaleSnapshot(data, form);
      if (form.netSales > snap.normalSales) throw new Error("실 결제금액은 정상가격 합계보다 클 수 없습니다.");
      if (form.netSales === 0 && !confirm("무료 제공 판매로 0원을 저장할까요?")) return;
      const duplicate = data.sales.find((row) => row.saleId !== form.saleId && row.date === form.date && row.menuId === form.menuId && row.channel === form.channel);
      if (duplicate) throw new Error(`같은 날짜·메뉴 기록(${duplicate.saleId})이 있습니다. 기존 기록을 수정해 주세요.`);
      const menu = data.menus.find((row) => row.menuId === form.menuId)!;
      const row: DataRow = { saleId: form.saleId ?? `S${Date.now()}`, date: form.date, menuId: form.menuId, channel: form.channel, quantity: form.quantity, unitPrice: numberOf(menu, "price"), discountAmount: snap.discountAmount, netSales: form.netSales, paymentFee: snap.paymentFee, recipeVersion: valueOf(menu, "recipeVersion"), unitFoodCostSnapshot: snap.unitFoodCost, unitPackagingCostSnapshot: snap.unitPackagingCost };
      await saveRecord("sales", row);
      setForm(null);
      setMessage("판매 기록이 저장되었습니다.");
      await load();
      await refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "저장하지 못했습니다."); }
  }

  async function remove(row: DataRow) {
    const menu = data?.menus.find((item) => item.menuId === row.menuId);
    if (!confirm(`${row.date} ${valueOf(menu ?? {}, "name")} ${row.quantity}개 판매를 삭제할까요?`)) return;
    await deleteRecord("sales", valueOf(row, "saleId"));
    setMessage("판매 기록을 삭제했습니다.");
    await load();
    await refresh();
  }

  function edit(row: DataRow) {
    setForm({ saleId: valueOf(row, "saleId"), date: valueOf(row, "date"), menuId: valueOf(row, "menuId"), channel: valueOf(row, "channel") === "포장" ? "포장" : "매장", quantity: numberOf(row, "quantity"), netSales: numberOf(row, "netSales") });
    setMessage("");
  }

  function toggleGroup(key: string) {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  if (!data) return <section className="page"><div className="empty-card">데이터 관리에서 자료를 먼저 준비해 주세요.</div></section>;

  return <section className="page">
    <div className="page-heading"><div><p className="eyebrow">판매 원장</p><h1>판매 기록 관리</h1><p>판매를 저장하면 수익성과 재고가 함께 갱신됩니다.</p></div><button className="button primary" onClick={openNew}><Plus size={16} />판매 입력</button></div>
    {message && <div className="notice info" role="status"><span>{message}</span></div>}
    <PeriodFilters unit={filters.unit} date={date} onUnit={(unit) => { updateFilters({ unit }); setPage(1); }} onDate={(nextDate) => { updateFilters({ date: nextDate }); setPage(1); }} extra={<><label>메뉴 분류<select value={filters.category} onChange={(event) => { updateFilters({ category: event.target.value, menu: "" }); setPage(1); }}><option value="">전체</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></label><label className="grow">검색<input value={filters.query} onChange={(event) => { updateFilters({ query: event.target.value }); setPage(1); }} placeholder="메뉴명, 분류 또는 기록 ID" /></label></>} />
    {filters.menu && <div className="notice info"><span>선택 메뉴: <strong>{valueOf(data.menus.find((row) => row.menuId === filters.menu) ?? {}, "name") || filters.menu}</strong></span><button className="button secondary compact" onClick={() => updateFilters({ menu: "" })}>전체 메뉴 보기</button></div>}
    <div className="sales-kpi-grid" aria-label="판매 핵심 지표">
      <section className="sales-kpi-card quantity"><span>판매 수량</span><strong>{totals.quantity.toLocaleString()}<small>개</small></strong><p>{period.start} ~ {period.end}</p></section>
      <section className="sales-kpi-card payment"><span>실 결제금액</span><strong>{won(totals.net)}</strong><p>선택한 기간의 실제 받은 금액</p></section>
      <section className="sales-kpi-sub"><div><span>할인</span><strong>{won(totals.discount)}</strong></div><div><span>결제 수수료</span><strong>{won(totals.fee)}</strong></div><small>같은 날 같은 메뉴는 한 줄로 합산됩니다.</small></section>
    </div>
    <div className="card table-card"><div className="table-wrap"><table className="data-table sales-record-table"><thead><tr><th>날짜 / ID</th><th>분류</th><th>메뉴</th><th className="num">수량</th><th className="num">정상가격</th><th className="num">할인</th><th className="num">실 결제</th><th className="num">수수료</th><th>관리</th></tr></thead><tbody>{pageRows.map((row) => {
      const menu = data.menus.find((item) => item.menuId === row.menuId) ?? {};
      const multiple = row.records.length > 1;
      const expanded = expandedGroups.has(row.key);
      return <Fragment key={row.key}><tr className={multiple ? "sales-group-row" : ""}><td>{row.date}<small>{multiple ? `${row.records.length}건 합산` : valueOf(row.records[0], "saleId")}</small></td><td><span className="category-badge">{displayMenuCategory(menu)}</span></td><td><Link href={hrefFor("/profitability", { menu: row.menuId, query: "" })} className="table-link">{valueOf(menu, "name")}</Link></td><td className="num"><strong>{row.quantity.toLocaleString()}</strong></td><td className="num">{won(row.normalSales)}</td><td className="num">{won(row.discount)}</td><td className="num"><strong>{won(row.netSales)}</strong></td><td className="num">{won(row.fees)}</td><td>{multiple ? <button className={`group-toggle ${expanded ? "active" : ""}`} aria-expanded={expanded} onClick={() => toggleGroup(row.key)}>{row.records.length}건 보기<ChevronDown size={15} /></button> : <><button className="icon-button" aria-label="수정" onClick={() => edit(row.records[0])}><Pencil size={15} /></button><button className="icon-button danger-text" aria-label="삭제" onClick={() => remove(row.records[0])}><Trash2 size={15} /></button></>}</td></tr>{multiple && expanded && <tr className="sales-group-detail"><td colSpan={9}><div><p><strong>{row.date} · {valueOf(menu, "name")}</strong><span>합산 전 원본 {row.records.length}건</span></p><div className="sales-group-records">{row.records.map((record) => <div key={valueOf(record, "saleId")}><span>{valueOf(record, "saleId")}</span><strong>{numberOf(record, "quantity").toLocaleString()}개</strong><b>{won(numberOf(record, "netSales"))}</b><span><button className="icon-button" aria-label={`${valueOf(record, "saleId")} 수정`} onClick={() => edit(record)}><Pencil size={15} /></button><button className="icon-button danger-text" aria-label={`${valueOf(record, "saleId")} 삭제`} onClick={() => remove(record)}><Trash2 size={15} /></button></span></div>)}</div></div></td></tr>}</Fragment>;
    })}</tbody></table></div>{!rows.length && <div className="table-empty">조건에 맞는 판매 기록이 없습니다.</div>}<Pagination page={page} pages={Math.max(1, Math.ceil(rows.length / 20))} setPage={setPage} /></div>
    {form && <div className="modal-backdrop" role="presentation"><form className="modal" onSubmit={submit}><div className="modal-head"><div><p className="eyebrow">{form.saleId ? "판매 수정" : "새 판매"}</p><h2>판매 기록</h2></div><button type="button" className="icon-button" aria-label="닫기" onClick={() => setForm(null)}>✕</button></div><div className="form-grid"><label>판매일자<input required type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></label><label>메뉴<select value={form.menuId} onChange={(event) => updateMenu(event.target.value)}>{menuGroups.map((group) => <optgroup key={group.category} label={group.category}>{group.menus.map((menu) => <option key={valueOf(menu, "menuId")} value={valueOf(menu, "menuId")}>{menu.name}</option>)}</optgroup>)}</select></label><label>판매수량<input required type="number" min="1" step="1" value={form.quantity} onChange={(event) => updateQuantity(Number(event.target.value))} /></label><label>실 결제금액<input required type="number" min="0" value={form.netSales} onChange={(event) => setForm({ ...form, netSales: Number(event.target.value) })} /></label></div>{snapshot && <div className="preview"><h3>저장 전 계산</h3><div className="preview-grid"><span>정상가격<strong>{won(snapshot.normalSales)}</strong></span><span>할인<strong>{won(snapshot.discountAmount)}</strong></span><span>결제수수료<strong>{won(snapshot.paymentFee)}</strong></span><span>직접원가<strong>{won(snapshot.directCost)}</strong></span><span>공헌이익<strong>{won(snapshot.contribution)}</strong></span><span>공헌이익률<strong>{rate(snapshot.contributionRate)}</strong></span></div><p>{snapshot.usage.map((item) => `${item.name} ${item.quantity.toLocaleString()}${item.unit}`).join(" · ")}</p></div>}<div className="modal-actions"><button type="button" className="button secondary" onClick={() => setForm(null)}>취소</button><button className="button primary">저장</button></div></form></div>}
  </section>;
}

function Pagination({ page, pages, setPage }: { page: number; pages: number; setPage: (value: number) => void }) { return <div className="pagination"><button disabled={page <= 1} onClick={() => setPage(page - 1)}>이전</button><span>{page} / {pages}</span><button disabled={page >= pages} onClick={() => setPage(page + 1)}>다음</button></div>; }
