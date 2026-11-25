"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { inPeriod, periodFor, type PeriodUnit } from "@/lib/calculations";
import { clearDatasetSessionCache, deleteRecord, readDataset, saveExpenseBatch, saveRecord } from "@/lib/data/database";
import type { CafeDataset, DataRow } from "@/lib/data/types";
import { numberOf, valueOf, won } from "@/lib/format";
import { draftRecords, expenseAmount, expenseCategories, parseExpensePaste, recurringDrafts, summarizeExpenseCategories, validateExpense, type ExpenseDraft } from "@/lib/expenseWorkspace";
import { useCafeData } from "./DataProvider";
import { PeriodFilters } from "./PeriodFilters";
import { ExpenseMeeting } from "./ExpenseMeeting";
import "./expenses.css";

type Tab = "input" | "records" | "meeting";
type Edit = { row: DataRow; amount: string };
const newId = () => "X-" + crypto.randomUUID();
function blank(category: string, date: string): ExpenseDraft { return { id: newId(), category, date, amount: "", memo: "", vendor: "" }; }
function hasDraft(draft: ExpenseDraft) { return Boolean(draft.amount.trim() || draft.memo.trim() || draft.vendor.trim()); }

export function ExpensesManager() {
  const { refresh } = useCafeData();
  const [data, setData] = useState<CafeDataset | null>(null);
  const [date, setDate] = useState("");
  const [tab, setTab] = useState<Tab>("input");
  const [unit, setUnit] = useState<PeriodUnit>("month");
  const [category, setCategory] = useState("전체");
  const [query, setQuery] = useState("");
  const [drafts, setDrafts] = useState<ExpenseDraft[]>([]);
  const [paste, setPaste] = useState("");
  const [message, setMessage] = useState("");
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [pendingBatch, setPendingBatch] = useState<DataRow[] | null>(null);
  const [edit, setEdit] = useState<Edit | null>(null);
  const month = date.slice(0, 7);
  const dirty = drafts.some(hasDraft) || Boolean(paste.trim()) || Boolean(pendingBatch);
  const categories = useMemo(() => data ? expenseCategories(data) : [], [data]);

  useEffect(() => {
    let active = true;
    readDataset().then(next => {
      if (!active) return;
      if (!next) { setLoadError("데이터 관리에서 자료를 먼저 준비해 주세요."); return; }
      const first = next.meta.asOf.slice(0, 7) + "-01";
      setData(next); setDate(first);
      setDrafts(expenseCategories(next).map(value => blank(value, first)));
    }).catch(error => { if (active) setLoadError(error instanceof Error ? error.message : "자료를 불러오지 못했습니다."); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!dirty && !edit) return;
    const protect = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, [dirty, edit]);

  const reload = useCallback(async () => {
    clearDatasetSessionCache();
    const next = await readDataset();
    if (next) setData(next);
    await refresh();
  }, [refresh]);

  const groups = useMemo(() => data && month ? summarizeExpenseCategories(data, month) : [], [data, month]);
  const period = date ? periodFor(unit, date) : { start: "", end: "" };
  const rows = useMemo(() => data ? data.expenses.filter(row =>
    inPeriod(valueOf(row, "date"), period) && (category === "전체" || row.category === category) &&
    (!query || [row.category, row.memo, row.vendor].some(value => String(value ?? "").toLowerCase().includes(query.toLowerCase())))
  ).sort((a, b) => valueOf(b, "date").localeCompare(valueOf(a, "date"))) : [], [data, period.start, period.end, category, query]); // eslint-disable-line react-hooks/exhaustive-deps
  const activeDrafts = drafts.filter(draft => draft.amount.trim() !== "");
  const draftTotal = activeDrafts.reduce((sum, draft) => {
    try { return sum + expenseAmount(draft.amount); } catch { return sum; }
  }, 0);
  const savedTotal = groups.reduce((sum, group) => sum + group.total, 0);

  function changeDate(next: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(next)) return;
    if (next.slice(0, 7) !== month) {
      if (pendingBatch) { setMessage("저장 결과가 확인되지 않은 입력이 있습니다. 같은 입력 재시도를 먼저 완료해 주세요."); return; }
      if (dirty && !confirm("작성 중인 입력을 버리고 다른 달로 이동할까요?")) return;
      setDrafts(categories.map(value => blank(value, next.slice(0, 7) + "-01"))); setPaste(""); setMessage("");
    }
    setDate(next);
  }
  function updateDraft(id: string, change: Partial<ExpenseDraft>) {
    setDrafts(current => current.map(draft => draft.id === id ? { ...draft, ...change } : draft));
  }
  function loadRecurring() {
    if (!data) return;
    const additions = recurringDrafts(data, month, drafts, newId);
    const replaced = new Set(additions.map(draft => draft.category));
    setDrafts(current => [...current.filter(draft => hasDraft(draft) || !replaced.has(draft.category)), ...additions]);
    setMessage(additions.length ? additions.length + "건을 초안으로 불러왔습니다. 귀속일과 금액을 확인한 뒤 저장해 주세요." : "불러올 정기비용이 없거나 이미 입력된 항목입니다.");
  }
  function importPaste() {
    try {
      const imported = parseExpensePaste(paste, month, categories, newId);
      if (!imported.length) throw new Error("붙여넣을 내역을 입력해 주세요.");
      setDrafts(current => [...current.filter(hasDraft), ...imported]); setPaste("");
      setMessage(imported.length + "행을 입력표에 추가했습니다. 검토 후 전체 저장을 눌러 주세요.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "붙여넣기를 확인해 주세요."); }
  }
  function enterNext(event: KeyboardEvent<HTMLTableElement>) {
    if (event.key !== "Enter" || (event.target as HTMLElement).tagName !== "INPUT") return;
    event.preventDefault();
    const fields = [...event.currentTarget.querySelectorAll<HTMLInputElement>("input:not(:disabled)")];
    fields[fields.indexOf(event.target as HTMLInputElement) + 1]?.focus();
  }
  async function saveAll() {
    if (!data || saving.current) return;
    try {
      const batch = pendingBatch ?? draftRecords(drafts, month);
      if (!batch.length) throw new Error("저장할 금액을 입력해 주세요. 지출이 없으면 0을 입력할 수 있습니다.");
      if (!pendingBatch) {
        const fingerprints = new Set(data.expenses.map(row => [row.date, row.category, row.amount].join("|")));
        let duplicates = 0;
        for (const row of batch) {
          const key = [row.date, row.category, row.amount].join("|");
          if (fingerprints.has(key)) duplicates++;
          fingerprints.add(key);
        }
        const warning = duplicates ? "\n같은 날짜·항목·금액 " + duplicates + "건이 있습니다. 별도 지출이 맞는지 확인해 주세요." : "";
        if (!confirm(batch.length + "건 · " + won(batch.reduce((sum, row) => sum + numberOf(row, "amount"), 0)) + "을 추가 저장할까요?" + warning)) return;
      }
      saving.current = true; setBusy(true); setPendingBatch(batch);
      await saveExpenseBatch(batch);
      setPendingBatch(null); setDrafts(categories.map(value => blank(value, month + "-01"))); setPaste("");
      setMessage(batch.length + "건을 저장했습니다.");
      try { await reload(); } catch { setMessage("저장은 완료됐습니다. 최신 합계를 불러오지 못했으니 페이지를 새로고침해 주세요."); }
    } catch (error) {
      setMessage((error instanceof Error ? error.message : "저장 결과를 확인하지 못했습니다.") + (saving.current ? " 입력은 보관 중입니다. ‘같은 입력 재시도’를 눌러 주세요." : ""));
    } finally { saving.current = false; setBusy(false); }
  }
  async function saveEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!edit || saving.current) return;
    try {
      const next = { ...edit.row, amount: expenseAmount(edit.amount) };
      validateExpense(next);
      saving.current = true; setBusy(true);
      await saveRecord("expenses", next);
      setEdit(null); setMessage("비용 기록을 수정했습니다.");
      await reload();
    } catch (error) { setMessage(error instanceof Error ? error.message : "수정하지 못했습니다."); }
    finally { saving.current = false; setBusy(false); }
  }
  async function remove(row: DataRow) {
    if (saving.current || !confirm(valueOf(row, "date") + " " + valueOf(row, "category") + " " + won(numberOf(row, "amount")) + " 기록을 삭제할까요?")) return;
    saving.current = true; setBusy(true);
    try { await deleteRecord("expenses", valueOf(row, "expenseId")); await reload(); setMessage("비용 기록을 삭제했습니다."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "삭제하지 못했습니다."); }
    finally { saving.current = false; setBusy(false); }
  }
  if (!data) return <section className="page"><div className="empty-card" role="status">{loadError || "운영비용을 불러오고 있습니다…"}</div></section>;

  return <section className="page expense-workspace">
    <div className="page-heading no-print"><div><p className="eyebrow">관리자 · 월별 운영 지출</p><h1>운영비용</h1><p>한 달 비용을 함께 입력하고 월말 미팅에서 비교합니다.</p></div>
      <label>조회 월<input type="month" aria-label="조회 월" value={month} disabled={busy || Boolean(pendingBatch)} onChange={event => changeDate(event.target.value + "-01")} /></label>
    </div>
    <nav className="expense-tabs no-print" aria-label="운영비용 화면">
      {([["input", "월별 입력"], ["records", "지출 내역"], ["meeting", "월말 미팅"]] as const).map(([key, label]) =>
        <button type="button" className={"button " + (tab === key ? "primary" : "secondary")} key={key} aria-pressed={tab === key} onClick={() => setTab(key)}>{label}</button>)}
    </nav>
    {message && <div className="notice info no-print" role="status">{message}</div>}
    {dirty && tab !== "input" && <p className="expense-help no-print">작성 중인 비용은 아직 집계에 포함되지 않았습니다. 월별 입력에서 저장해 주세요.</p>}
    {tab === "input" && <>
      <div className="expense-toolbar"><button className="button secondary" disabled={busy || Boolean(pendingBatch)} onClick={loadRecurring}>정기비용 불러오기</button>
        <button className="button secondary" disabled={busy || Boolean(pendingBatch)} onClick={() => setDrafts(current => [...current, blank(categories[0] || "", month + "-01")])}><Plus size={16} />내역 추가</button>
        <button className="button primary" disabled={busy} onClick={saveAll}>{busy ? "저장 확인 중…" : pendingBatch ? "같은 입력 재시도" : "전체 저장"}</button>
      </div>
      <p className="expense-help">금액 칸에는 추가 지출을 입력합니다. 저장된 기록은 아래 합계 또는 지출 내역에서 확인하세요. 빈칸은 미입력, 0은 지출 없음 확인입니다. 금액은 VAT 제외 기준입니다.</p>
      <div className="summary-strip"><span>저장된 월 비용 <strong>{won(savedTotal)}</strong></span><span>추가 입력 <strong>{activeDrafts.length}건 · {won(draftTotal)}</strong></span><span>저장 후 합계 <strong>{won(savedTotal + draftTotal)}</strong></span></div>
      <fieldset disabled={busy || Boolean(pendingBatch)} className="expense-fieldset">
        <div className="card table-card"><div className="table-wrap"><table className="data-table expense-entry-table" onKeyDown={enterNext}>
          <thead><tr><th>비용항목 / 저장된 월 합계</th><th>귀속일</th><th>추가 금액 · 원</th><th>내용·증가 사유</th><th>거래처</th><th>행</th></tr></thead>
          <tbody>{drafts.map((draft, index) => {
            const group = groups.find(value => value.category === draft.category);
            return <tr key={draft.id}>
              <td data-label="비용항목"><select aria-label={"비용항목 " + (index + 1)} value={draft.category} onChange={event => updateDraft(draft.id, { category: event.target.value })}>{categories.map(value => <option key={value}>{value}</option>)}</select><small>{group?.count ? won(group.total) + " · " + group.count + "건" : "미입력"}</small></td>
              <td data-label="귀속일"><input aria-label={"귀속일 " + (index + 1)} type="date" min={month + "-01"} max={periodFor("month", month + "-01").end} value={draft.date} onChange={event => updateDraft(draft.id, { date: event.target.value })} /></td>
              <td data-label="추가 금액"><input aria-label={"추가 금액 " + (index + 1)} inputMode="numeric" placeholder="미입력" value={draft.amount} onChange={event => updateDraft(draft.id, { amount: event.target.value })} /><small>{draft.amount.trim() === "0" ? "0원 확인" : draft.amount.trim() ? "입력 중" : "미입력"}</small></td>
              <td data-label="메모"><input aria-label={"메모 " + (index + 1)} value={draft.memo} placeholder="예: 냉방 사용 증가" onChange={event => updateDraft(draft.id, { memo: event.target.value })} /></td>
              <td data-label="거래처"><input aria-label={"거래처 " + (index + 1)} value={draft.vendor} onChange={event => updateDraft(draft.id, { vendor: event.target.value })} /></td>
              <td><button type="button" className="icon-button" aria-label={"입력행 제거 " + (index + 1)} onClick={() => setDrafts(current => current.filter(value => value.id !== draft.id))}><Trash2 size={16} /></button></td>
            </tr>;
          })}</tbody>
        </table></div></div>
        <details className="expense-paste"><summary>엑셀 여러 행 붙여넣기</summary><p>귀속일 · 비용항목 · 금액 · 메모 · 거래처 순서로 열을 복사해 붙여넣으세요. 날짜는 YYYY-MM-DD 형식, 비용항목은 위 목록의 이름을 사용합니다.</p>
          <textarea aria-label="엑셀 내역 붙여넣기" value={paste} onChange={event => setPaste(event.target.value)} rows={4} placeholder={month + "-01\t임차료\t3200000\t월 임대료\t"} />
          <button className="button secondary" onClick={importPaste}>입력표에 추가</button>
        </details>
      </fieldset>
      <details className="expense-paste"><summary>저장된 항목별 월 합계</summary>{groups.filter(group => group.count).map(group => <div className="expense-saved-group" key={group.category}><button className="expense-text-button" onClick={() => { setCategory(group.category); setUnit("month"); setTab("records"); }}>{group.category}</button><strong>{won(group.total)}</strong><span>{group.count}건</span></div>)}</details>
    </>}
    {tab === "records" && <>
      <PeriodFilters unit={unit} date={date} onUnit={setUnit} onDate={changeDate} extra={<><label>비용항목<select value={category} onChange={event => setCategory(event.target.value)}><option>전체</option>{categories.map(value => <option key={value}>{value}</option>)}</select></label><label>검색<input value={query} onChange={event => setQuery(event.target.value)} placeholder="항목·메모·거래처" /></label></>} />
      <div className="summary-strip"><span>기록 <strong>{rows.length}건</strong></span><span>비용 합계 <strong>{won(rows.reduce((sum, row) => sum + numberOf(row, "amount"), 0))}</strong></span></div>
      <div className="card table-card"><div className="table-wrap"><table className="data-table"><thead><tr><th>날짜 / ID</th><th>비용항목</th><th>메모·거래처</th><th className="num">VAT 제외 금액</th><th>관리</th></tr></thead><tbody>{rows.map(row => <tr key={valueOf(row, "expenseId")}><td>{row.date}<small>{row.expenseId}</small></td><td>{row.category}<small>{row.recognition}</small></td><td>{row.memo || "—"}<small>{row.vendor}</small></td><td className="num">{won(numberOf(row, "amount"))}</td><td><button className="icon-button" disabled={busy || Boolean(pendingBatch)} aria-label={"비용 수정 " + row.expenseId} onClick={() => setEdit({ row: { ...row }, amount: String(row.amount) })}><Pencil size={15} /></button><button className="icon-button danger-text" disabled={busy || Boolean(pendingBatch)} aria-label={"비용 삭제 " + row.expenseId} onClick={() => remove(row)}><Trash2 size={15} /></button></td></tr>)}</tbody></table></div>{!rows.length && <div className="table-empty">조건에 맞는 비용 기록이 없습니다.</div>}</div>
    </>}
    {tab === "meeting" && <ExpenseMeeting key={month} data={data} month={month} openCategory={value => { setCategory(value); setUnit("month"); setQuery(""); setTab("records"); }} />}
    {edit && <div className="modal-backdrop"><form className="modal small" onSubmit={saveEdit}><div className="modal-head"><h2>비용 수정</h2><button type="button" className="icon-button" disabled={busy} aria-label="수정 취소" onClick={() => setEdit(null)}>✕</button></div><fieldset disabled={busy} className="expense-fieldset form-grid one">
      <label>귀속일<input type="date" required value={valueOf(edit.row, "date")} onChange={event => setEdit({ ...edit, row: { ...edit.row, date: event.target.value } })} /></label>
      <label>비용항목<select value={valueOf(edit.row, "category")} onChange={event => setEdit({ ...edit, row: { ...edit.row, category: event.target.value } })}>{categories.map(value => <option key={value}>{value}</option>)}</select></label>
      <label>VAT 제외 금액<input required inputMode="numeric" value={edit.amount} onChange={event => setEdit({ ...edit, amount: event.target.value })} /></label>
      <label>메모<input value={valueOf(edit.row, "memo")} onChange={event => setEdit({ ...edit, row: { ...edit.row, memo: event.target.value } })} /></label>
      <label>거래처<input value={valueOf(edit.row, "vendor")} onChange={event => setEdit({ ...edit, row: { ...edit.row, vendor: event.target.value } })} /></label>
      </fieldset><div className="modal-actions"><button type="button" className="button secondary" disabled={busy} onClick={() => setEdit(null)}>취소</button><button className="button primary" disabled={busy}>저장</button></div></form></div>}
  </section>;
}
