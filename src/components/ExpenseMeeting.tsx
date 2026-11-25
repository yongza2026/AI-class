"use client";

import { useMemo, useState } from "react";
import { calculateActualPnl, periodFor } from "@/lib/calculations";
import { previousMonth, summarizeExpenseCategories } from "@/lib/expenseWorkspace";
import type { CafeDataset } from "@/lib/data/types";
import { rate, valueOf, won } from "@/lib/format";

export function ExpenseMeeting({ data, month, openCategory }: { data: CafeDataset; month: string; openCategory: (category: string) => void }) {
  const [notes, setNotes] = useState("");
  const [teamView, setTeamView] = useState(false);
  const period = periodFor("month", month + "-01");
  const current = calculateActualPnl(data, period);
  const previous = calculateActualPnl(data, periodFor("month", previousMonth(month) + "-01"));
  const groups = summarizeExpenseCategories(data, month);
  const increases = groups.filter(g => g.previous !== null && g.total > g.previous).sort((a, b) => (b.total - b.previous!) - (a.total - a.previous!)).slice(0, 3);
  const calendar = data.calendar.filter(row => String(row.date).startsWith(month + "-"));
  const closedDays = calendar.filter(row => row.recordComplete === true).length;
  const expectedDays = Number(period.end.slice(-2));
  const history = useMemo(() => {
    const months = [month];
    for (let index = 1; index < 6; index++) months.unshift(previousMonth(months[0]));
    return months.map(value => ({ month: value, pnl: calculateActualPnl(data, periodFor("month", value + "-01")) }));
  }, [data, month]);
  const basis = data.meta.amountBasis || "자료 설정 확인 필요";
  return <div className="expense-meeting">
    <div className="expense-toolbar no-print">
      <label className="expense-check"><input type="checkbox" checked={teamView} onChange={event => setTeamView(event.target.checked)} />회의 공유 화면 · 비용 합계 중심</label>
      <button type="button" className="button secondary" onClick={() => window.print()}>회의자료 인쇄 / PDF</button>
    </div>
    <div className="expense-report-title"><h2>{month} 월말 운영 미팅</h2><p>집계 중 · 일 마감 {closedDays}/{expectedDays}일 · 매출 기준 {basis}</p></div>
    <div className="metric-grid">
      <Metric label="매출" value={won(current.total.netSales)} />
      <Metric label="식재료·포장 원가" value={won(current.total.directCost)} />
      <Metric label="운영비용" value={won(current.total.expenses)} />
      <Metric label="관리용 손익" value={won(current.total.operatingProfit)} detail={rate(current.total.operatingRate)} />
    </div>
    <p className="expense-help">저장된 기록 기준 잠정 집계입니다. 직접원가와 결제수수료는 판매 기록에서 계산합니다. 운영비용은 VAT 제외 입력 기준이며, 매출의 금액 기준이 일치하는지 확인해 주세요.</p>
    <div className="card table-card"><div className="table-wrap"><table className="data-table">
      <caption>이번 달과 전월 전체 기간 비교 · 전월 기록이 없으면 — 표시</caption>
      <thead><tr><th>구분</th><th className="num">이번 달</th><th className="num">전월</th><th className="num">증감</th></tr></thead>
      <tbody>{[
        ["매출", current.total.netSales, previous.total.netSales],
        ["식재료·포장 원가", current.total.directCost, previous.total.directCost],
        ["결제수수료", current.total.fees, previous.total.fees],
        ["운영비용", current.total.expenses, previous.total.expenses],
        ["관리용 손익", current.total.operatingProfit, previous.total.operatingProfit],
      ].map(([label, value, prior]) => <tr key={String(label)}><th>{label}</th><td className="num">{won(Number(value))}</td><td className="num">{previous.includedStart ? won(Number(prior)) : "—"}</td><td className="num">{previous.includedStart ? signed(Number(value) - Number(prior)) : "—"}</td></tr>)}</tbody>
    </table></div></div>
    {!teamView && <>
      <h2>항목별 비용 비교</h2>
      <div className="card table-card"><div className="table-wrap"><table className="data-table">
        <thead><tr><th>비용항목</th><th className="num">이번 달</th><th className="num">전월</th><th className="num">예산</th><th className="num">예산 대비</th><th className="num">매출 대비</th><th>입력 상태</th></tr></thead>
        <tbody>{groups.map(group => <tr key={group.category}>
          <td><button className="expense-text-button" onClick={() => openCategory(group.category)}>{group.category}</button></td>
          <td className="num">{group.count ? won(group.total) : "—"}</td><td className="num">{group.previous === null ? "—" : won(group.previous)}</td>
          <td className="num">{group.budget === null ? "—" : won(group.budget)}</td><td className="num">{group.budget === null || !group.count ? "—" : signed(group.total - group.budget)}</td>
          <td className="num">{current.total.netSales && group.count ? rate(group.total / current.total.netSales * 100) : "—"}</td>
          <td>{!group.count ? "미입력" : group.total === 0 ? "0원 확인" : "입력 완료"}</td>
        </tr>)}</tbody>
      </table></div></div>
      <h2>전월보다 증가한 비용</h2>
      {increases.length ? <div className="expense-increases">{increases.map(group => <article key={group.category}>
        <strong>{group.category} · {signed(group.total - group.previous!)}</strong>
        <p>{group.rows.map(row => valueOf(row, "memo")).filter(Boolean).join(" / ") || "지출 내역에서 증가 사유를 메모해 주세요."}</p>
        <button className="button secondary compact" onClick={() => openCategory(group.category)}>내역 확인</button>
      </article>)}</div> : <p>전월 기록과 비교할 수 있는 증가 항목이 없습니다.</p>}
    </>}
    <h2>최근 6개월 흐름</h2>
    <div className="card table-card"><div className="table-wrap"><table className="data-table">
      <thead><tr><th>월</th><th className="num">매출</th><th className="num">운영비용</th><th className="num">관리용 손익</th></tr></thead>
      <tbody>{history.map(item => <tr key={item.month}><th>{item.month}</th><td className="num">{item.pnl.includedStart ? won(item.pnl.total.netSales) : "—"}</td><td className="num">{item.pnl.includedStart ? won(item.pnl.total.expenses) : "—"}</td><td className="num">{item.pnl.includedStart ? won(item.pnl.total.operatingProfit) : "—"}</td></tr>)}</tbody>
    </table></div></div>
    <label className="expense-notes">회의 결정사항 · 담당자 · 기한
      <textarea value={notes} onChange={event => setNotes(event.target.value)} placeholder="예: 전기료 증가 원인 확인 / 담당자 / 다음 달 5일" rows={4} />
    </label>
    <p className="expense-help no-print">회의 메모는 이 화면에서 작성한 후 인쇄/PDF로 보관합니다. 공유 화면은 현재 화면의 표시만 바꾸며 접근 권한은 관리자에게 유지됩니다.</p>
    <div className="expense-print-notes">{notes}</div>
  </div>;
}
function signed(value: number) { return (value > 0 ? "+" : "") + won(value); }
function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <div className="metric-card"><span>{label}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</div>;
}
