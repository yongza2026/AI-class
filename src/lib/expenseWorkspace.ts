import type { CafeDataset, DataRow } from "./data/types";
import { DEFAULT_EXPENSE_CATEGORIES } from "./data/expenseCategories";
import { numberOf, valueOf } from "./format";

export type ExpenseDraft = { id: string; date: string; category: string; amount: string; memo: string; vendor: string };
export function previousMonth(month: string): string {
  const [year, value] = month.split("-").map(Number);
  return value === 1 ? `${year - 1}-12` : `${year}-${String(value - 1).padStart(2, "0")}`;
}
export function expenseCategories(data: CafeDataset): string[] {
  return [...new Set([...DEFAULT_EXPENSE_CATEGORIES, ...data.expenses.map(r => valueOf(r, "category")), ...data.monthlyExpensePlan.map(r => valueOf(r, "category"))])].filter(Boolean);
}
export function expenseAmount(text: string): number {
  const cleaned = text.trim().replace(/,/g, "").replace(/원$/, "").trim();
  if (!/^\d+$/.test(cleaned) || !Number.isSafeInteger(Number(cleaned))) throw new Error("금액은 0 이상의 정수로 입력해 주세요.");
  return Number(cleaned);
}
export function validateExpense(row: DataRow): void {
  const date = valueOf(row, "date");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) throw new Error("날짜를 확인해 주세요.");
  if (!valueOf(row, "expenseId") || !valueOf(row, "category").trim()) throw new Error("비용항목을 입력해 주세요.");
  if (!Number.isSafeInteger(row.amount) || Number(row.amount) < 0) throw new Error("금액은 0 이상의 정수로 입력해 주세요.");
}
export function draftRecords(drafts: ExpenseDraft[], month: string): DataRow[] {
  if (drafts.some(d => !d.amount.trim() && (d.memo.trim() || d.vendor.trim()))) throw new Error("메모 또는 거래처를 입력한 행의 금액을 확인해 주세요.");
  return drafts.filter(d => d.amount.trim() !== "").map((d, index) => {
    try {
      if (!d.date.startsWith(month + "-")) throw new Error("선택한 월의 날짜를 입력해 주세요.");
      const row: DataRow = { expenseId: d.id, date: d.date, category: d.category.trim(), amount: expenseAmount(d.amount), memo: d.memo.trim(), vendor: d.vendor.trim(), recognition: "월별 일괄 입력" };
      validateExpense(row);
      return row;
    } catch (error) { throw new Error(`${index + 1}번째 입력 (${d.category}): ${error instanceof Error ? error.message : "값을 확인해 주세요."}`); }
  });
}
export function parseExpensePaste(text: string, month: string, categories: string[], createId: () => string): ExpenseDraft[] {
  const lines = text.split(/\r?\n/).filter(line => line.trim());
  if (lines.length > 500) throw new Error("한 번에 500행까지 붙여넣을 수 있습니다.");
  return lines.map((line, index) => {
    const [date = "", category = "", amount = "", memo = "", vendor = ""] = line.split("\t").map(value => value.trim());
    if (!categories.includes(category)) throw new Error(`${index + 1}행의 비용항목 '${category}'을 목록에서 확인해 주세요.`);
    const row = { id: createId(), date, category, amount, memo, vendor };
    draftRecords([row], month);
    if (!amount) throw new Error(`${index + 1}행에 금액을 입력해 주세요.`);
    return row;
  });
}
export function monthExpenses(data: CafeDataset, month: string): DataRow[] {
  return data.expenses.filter(row => valueOf(row, "date").startsWith(month + "-"));
}
export function summarizeExpenseCategories(data: CafeDataset, month: string) {
  const current = monthExpenses(data, month);
  const previous = monthExpenses(data, previousMonth(month));
  const plans = data.monthlyExpensePlan.filter(row => row.month === month);
  return expenseCategories(data).map(category => {
    const rows = current.filter(row => row.category === category);
    const prior = previous.filter(row => row.category === category);
    const plan = plans.find(row => row.category === category);
    return { category, rows, count: rows.length, total: rows.reduce((sum, row) => sum + numberOf(row, "amount"), 0), previous: prior.length ? prior.reduce((sum, row) => sum + numberOf(row, "amount"), 0) : null, budget: plan ? numberOf(plan, "amount") : null };
  });
}
const recurringCategories = new Set(["인건비", "사업주 부담 보험료", "대표 월 보수", "임차료", "관리비", "통신·소프트웨어", "감가상각비 (비현금)", "지급이자"]);
export function recurringDrafts(data: CafeDataset, month: string, drafts: ExpenseDraft[], createId: () => string): ExpenseDraft[] {
  const occupied = new Set([...monthExpenses(data, month).map(row => valueOf(row, "category")), ...drafts.filter(row => row.amount.trim()).map(row => row.category)]);
  const planned = data.monthlyExpensePlan.filter(row => row.month === month);
  const prior = summarizeExpenseCategories(data, previousMonth(month));
  const rows = planned.length ? planned : prior.filter(row => row.count && recurringCategories.has(row.category)).map(row => ({ category: row.category, amount: row.total }));
  return rows.filter(row => !occupied.has(valueOf(row, "category"))).map(row => ({
    id: createId(), date: month + "-01", category: valueOf(row, "category"), amount: String(numberOf(row, "amount")),
    memo: planned.length ? "당월 비용계획에서 불러옴 · 귀속일 확인" : "전월 정기비용에서 불러옴 · 귀속일 확인", vendor: "",
  }));
}
