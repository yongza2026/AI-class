import "fake-indexeddb/auto";
import { afterAll, describe, expect, it } from "vitest";
import { emptyDataset } from "./data/migration";
import { db, saveExpenseBatch } from "./data/database";
import { validateDataset } from "./data/schema";
import { draftRecords, expenseAmount, parseExpensePaste, previousMonth, recurringDrafts, summarizeExpenseCategories } from "./expenseWorkspace";

const draft = { id: "expense-test", date: "2027-06-01", category: "임차료", amount: "3,200,000", memo: "월 임대료", vendor: "테스트" };
describe("운영비용 일괄 입력", () => {
  it("빈칸과 명시적 0원 확인을 구분한다", () => {
    expect(draftRecords([{ ...draft, amount: "", memo: "", vendor: "" }], "2027-06")).toEqual([]);
    expect(draftRecords([{ ...draft, amount: "0" }], "2027-06")[0].amount).toBe(0);
    expect(expenseAmount("3,200,000원")).toBe(3200000);
    for (const value of ["-1", "1.2", "1e6", "NaN", "9007199254740992"]) expect(() => expenseAmount(value)).toThrow();
  });
  it("다른 월과 존재하지 않는 날짜는 저장 전에 거부한다", () => {
    expect(() => draftRecords([{ ...draft, date: "2027-05-01" }], "2027-06")).toThrow();
    expect(() => draftRecords([{ ...draft, date: "2027-06-31" }], "2027-06")).toThrow();
  });
  it("엑셀 행을 검증하고 기존 ID로 재시도할 수 있다", () => {
    const rows = parseExpensePaste("2027-06-01\t임차료\t3,200,000\t임대료\t임대인", "2027-06", ["임차료"], () => "stable");
    expect(draftRecords(rows, "2027-06")[0]).toMatchObject({ expenseId: "stable", amount: 3200000, memo: "임대료", vendor: "임대인" });
    expect(() => parseExpensePaste("2027-06-01\t오타\t10", "2027-06", ["임차료"], () => "bad")).toThrow();
  });
  it("전월 정기비용은 이미 기록되었거나 작성 중인 항목을 건너뛴다", () => {
    const data = emptyDataset("2027-06-30");
    data.expenses = [{ expenseId: "a", date: "2027-05-01", category: "임차료", amount: 3200000, recognition: "직접 입력" }];
    expect(recurringDrafts(data, "2027-06", [], () => "b")).toHaveLength(1);
    expect(recurringDrafts(data, "2027-06", [draft], () => "b")).toHaveLength(0);
    data.expenses.push({ ...data.expenses[0], expenseId: "c", date: "2027-06-01" });
    expect(recurringDrafts(data, "2027-06", [], () => "b")).toHaveLength(0);
    expect(summarizeExpenseCategories(data, "2027-06").find(row => row.category === "임차료")).toMatchObject({ total: 3200000, previous: 3200000, budget: null });
    expect(previousMonth("2027-01")).toBe("2026-12");
  });
  it("메모와 거래처는 백업 검증 후에도 유지한다", () => {
    const data = emptyDataset("2027-06-30");
    data.expenses = draftRecords([draft], "2027-06");
    expect(validateDataset(data).data?.expenses[0]).toMatchObject({ memo: "월 임대료", vendor: "테스트" });
  });
  it("한 행이 잘못되면 전체 배치를 저장하지 않는다", async () => {
    const rows = draftRecords([draft], "2027-06");
    await expect(saveExpenseBatch([...rows, { ...rows[0], expenseId: "invalid", amount: -1 }])).rejects.toThrow();
    expect(await db.expenses.count()).toBe(0);
  });
  it("같은 배치 재시도와 동시에 실행한 요청이 중복 기록을 만들지 않는다", async () => {
    const rows = draftRecords([draft, { ...draft, id: "zero", amount: "0", category: "광고비" }], "2027-06");
    await Promise.all([saveExpenseBatch(rows), saveExpenseBatch(rows)]);
    await saveExpenseBatch(rows);
    expect(await db.expenses.count()).toBe(2);
    expect((await db.expenses.get("expense-test"))?.amount).toBe(3200000);
    expect((await db.expenses.get("zero"))?.amount).toBe(0);
  });
});
afterAll(async () => db.delete());
