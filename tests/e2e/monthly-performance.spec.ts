import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { normalizeExternalJson } from "../../src/lib/data/normalize";
import type { CafeDataset } from "../../src/lib/data/types";

test("월별 매출·전년 같은 기간·자료 없음·모바일·조회 무변경", async ({ page }, testInfo) => {
  test.skip(testInfo.project.use.baseURL !== "http://localhost:3102", "공용 DB와 분리된 월간 성과 검사 설정에서만 실행합니다.");
  const external: string[] = [];
  await page.route("**/*.supabase.co/**", (route) => { external.push(route.request().url()); return route.abort(); });
  const data = normalizeExternalJson(JSON.parse(readFileSync("public/sample/prep-cafe-v3.1.json", "utf8"))) as CafeDataset;
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "운영자료가 없습니다" })).toBeVisible();
  await page.evaluate(async (dataset) => {
    const database = await new Promise<IDBDatabase>((resolve) => { const request = indexedDB.open("cafe-operations"); request.onsuccess = () => resolve(request.result); });
    const tables = Object.keys(dataset).filter((key) => key !== "meta");
    await new Promise<void>((resolve, reject) => {
      const tx = database.transaction(["meta", ...tables], "readwrite");
      tx.objectStore("meta").put({ id: "current", ...dataset.meta });
      for (const table of tables) for (const row of dataset[table as keyof Omit<CafeDataset, "meta">]) tx.objectStore(table).put(row);
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
    }); database.close();
  }, data);
  const digest = () => page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve) => { const request = indexedDB.open("cafe-operations"); request.onsuccess = () => resolve(request.result); });
    const records = await Promise.all(Array.from(database.objectStoreNames).map((table) => new Promise<unknown>((resolve) => { const request = database.transaction(table).objectStore(table).getAll(); request.onsuccess = () => resolve([table, request.result]); })));
    database.close();
    return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(records))))).join(",");
  });
  const before = await digest();
  await page.reload();
  const panel = page.getByRole("region", { name: "월별 매출과 전년 동월 성장률" });
  await expect(panel).toBeVisible();
  const sum = (start: string, end: string) => data.sales.filter((row) => String(row.date) >= start && String(row.date) <= end).reduce((total, row) => total + Number(row.netSales), 0);
  const current = sum("2026-09-01", "2026-09-18");
  const previous = sum("2025-09-01", "2025-09-18");
  const money = (value: number) => `${value.toLocaleString("ko-KR")}원`;
  await expect(panel.locator(".monthly-kpis")).toContainText(money(current));
  await expect(panel.locator(".monthly-kpis")).toContainText(money(previous));
  await expect(panel.locator(".monthly-kpis")).toContainText(`${((current - previous) / previous * 100).toFixed(1)}%`);
  await expect(panel.locator(".monthly-kpis")).toContainText("2025-09-01 ~ 2025-09-18");
  await expect(panel.locator("tbody tr")).toHaveCount(12);
  await page.setViewportSize({ width: 1280, height: 2200 });
  await panel.screenshot({ path: "test-results/monthly-performance-desktop.png" });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.getByLabel("기준 날짜").fill("2025-08-31");
  await expect(panel.locator(".monthly-kpis")).toContainText("전년 자료 없음");
  await expect(panel.locator(".monthly-kpis")).not.toContainText("-100.0%");
  await page.getByLabel("기준 날짜").fill("2026-08-31");
  await expect(panel.locator(".monthly-kpis")).toContainText("2025-08-01 ~ 2025-08-31");
  await page.getByLabel("기준 날짜").fill("2026-09-18");
  await page.getByRole("button", { name: "일", exact: true }).click();
  await expect(panel.locator(".monthly-kpis")).toContainText(money(current));
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(panel).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await panel.screenshot({ path: "test-results/monthly-performance-mobile.png" });
  expect(await digest()).toBe(before);
  expect(external).toEqual([]);
});
