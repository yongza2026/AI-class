import "fake-indexeddb/auto";
import { afterAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { db, deleteRecord, readDataset, replaceDataset, saveRecord } from "./database";
import { normalizeExternalJson } from "./normalize";
import { validateDataset } from "./schema";

const checked = validateDataset(normalizeExternalJson(JSON.parse(readFileSync("public/sample/prep-cafe-v3.1.json", "utf8"))));
if (!checked.data) throw new Error("샘플 검증 실패");
const sample = checked.data;

describe("IndexedDB 저장", () => {
  it("전체 자료를 한 거래로 교체하고 다시 읽는다", async () => {
    await replaceDataset(sample);
    const stored = await readDataset();
    expect(stored?.sales).toHaveLength(6112);
    expect(stored?.menus).toHaveLength(8);
  });
  it("판매 기록을 저장·삭제한다", async () => {
    await saveRecord("sales", { ...sample.sales[0], saleId: "S-TEST", date: "2026-09-19" });
    expect((await readDataset())?.sales.some((row) => row.saleId === "S-TEST")).toBe(true);
    await deleteRecord("sales", "S-TEST");
    expect((await readDataset())?.sales.some((row) => row.saleId === "S-TEST")).toBe(false);
  });
});

afterAll(async () => db.delete());
