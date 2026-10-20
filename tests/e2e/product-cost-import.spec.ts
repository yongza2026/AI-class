import { test, expect } from "@playwright/test";
import ExcelJS from "exceljs";
import readExcelFile from "read-excel-file/node";
import { emptyDataset } from "../../src/lib/data/migration";

test("제품 원가 파일: 다운로드, 검사, 미리보기, 취소, 저장, 재업로드, 새로고침", async ({ page }, testInfo) => {
  test.skip(testInfo.project.use.baseURL !== "http://localhost:3101", "공용 DB 연결을 비운 별도 제품 원가 검사 설정에서만 실행합니다.");
  const remoteWrites: string[] = [];
  await page.route("**/*.supabase.co/**", (route) => { remoteWrites.push(route.request().url()); return route.abort(); });
  await page.goto("/costs/");
  await expect(page.getByRole("link", { name: "POCO 운영관리" })).toBeVisible();
  await page.evaluate(async (data) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("cafe-operations");
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction("meta", "readwrite");
      transaction.objectStore("meta").put({ id: "current", ...data.meta });
      transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  }, emptyDataset("2026-10-20"));
  await page.reload();
  const fileInput = page.locator('input[type="file"]').last();
  const downloadResponse = await page.request.get("/templates/POCO_제품원가_업로드양식.xlsx");
  expect(downloadResponse.ok()).toBe(true);
  const workbook = new ExcelJS.Workbook();
  const templateSheets = await readExcelFile(await downloadResponse.body());
  for (const name of ["제품목록", "재료단가", "레시피입력"]) {
    workbook.addWorksheet(name).addRow(templateSheets.find((sheet) => sheet.sheet === name)!.data[0]);
  }
  workbook.getWorksheet("제품목록")!.getRow(2).values = ["P-001", "시그니처 라떼", "커피", 6500];
  workbook.getWorksheet("재료단가")!.getRow(2).values = ["우유", "ml", 1000, 2500, null, "식재료", ""];
  workbook.getWorksheet("재료단가")!.getRow(3).values = ["원두", "g", 1000, 28000, null, "식재료", ""];
  workbook.getWorksheet("레시피입력")!.getRow(2).values = ["P-001", "시그니처 라떼", "우유", 180, "ml"];
  workbook.getWorksheet("레시피입력")!.getRow(3).values = ["P-001", "시그니처 라떼", "원두", 18, "g"];
  const valid = Buffer.from(await workbook.xlsx.writeBuffer());
  const readCounts = () => page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve) => { const request = indexedDB.open("cafe-operations"); request.onsuccess = () => resolve(request.result); });
    const counts = await Promise.all(["menus", "materials", "recipes", "priceHistory", "inventoryEvents", "sales"].map((table) => new Promise<number>((resolve) => { const request = database.transaction(table).objectStore(table).count(); request.onsuccess = () => resolve(request.result); })));
    database.close(); return counts;
  });
  const upload = (buffer: Buffer, name = "제품원가_검사.xlsx") => fileInput.setInputFiles({ name, mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer });
  await upload(valid);
  const preview = page.getByLabel("제품 원가 가져오기 미리보기");
  await expect(preview).toBeVisible();
  await expect(preview.getByText("954원", { exact: true })).toBeVisible();
  await expect(preview.getByText("14.7%", { exact: true })).toBeVisible();
  expect(await readCounts()).toEqual([0, 0, 0, 0, 0, 0]);
  await preview.getByRole("button", { name: "취소" }).click();
  expect(await readCounts()).toEqual([0, 0, 0, 0, 0, 0]);
  await upload(valid);
  await preview.getByRole("button", { name: "확인 후 저장" }).click();
  await expect(page.getByRole("status")).toContainText("제품 1개 추가");
  expect(await readCounts()).toEqual([1, 2, 2, 2, 0, 0]);
  await upload(valid);
  await preview.getByRole("button", { name: "확인 후 저장" }).click();
  await expect(page.getByRole("status")).toContainText("제품 0개 추가·1개 수정");
  expect(await readCounts()).toEqual([1, 2, 2, 2, 0, 0]);
  await page.reload();
  await expect(page.locator(".cost-product")).toContainText("954원");
  await expect(page.locator(".cost-product")).toContainText("시그니처 라떼");
  workbook.getWorksheet("재료단가")!.getCell("D2").value = null;
  await upload(Buffer.from(await workbook.xlsx.writeBuffer()), "빈가격.xlsx");
  await expect(page.locator(".product-import-issues")).toContainText("재료단가 2행");
  await expect(page.getByRole("button", { name: "확인 후 저장" })).toHaveCount(0);
  expect(await readCounts()).toEqual([1, 2, 2, 2, 0, 0]);
  expect(remoteWrites).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("button", { name: "제품 원가 엑셀 업로드" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/product-cost-mobile.png", fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await upload(valid);
  await expect(preview).toBeVisible();
  await page.screenshot({ path: "test-results/product-cost-preview.png", fullPage: true });
});
