import { expect, test } from "@playwright/test";

test("샘플에서 판매 입력, 수익성, 비용, 재고, 손익으로 연결된다", async ({ page }) => {
  await page.goto("/data");
  await page.getByRole("button", { name: "샘플 불러오기" }).click();
  await expect(page.getByText("프렙 카페 가상 샘플을 저장했습니다")).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "엑셀 양식 다운로드" }).click();
  expect((await downloadPromise).suggestedFilename()).toMatch(/^카페운영_가져오기양식_\d{8}\.xlsx$/);

  await page.goto("/sales/new");
  await page.waitForTimeout(1000);
  await page.getByLabel("판매일자").fill("2026-09-19");
  await page.locator("form select").nth(0).selectOption("M02");
  await page.locator("form select").nth(1).selectOption("포장");
  await page.getByLabel("판매수량").fill("15");
  await page.getByLabel("실 결제금액").fill("70000");
  await expect(page.getByText("72,000원")).toBeVisible();
  await expect(page.getByText("1,050원")).toBeVisible();
  await page.locator("form").getByRole("button", { name: "저장" }).click();
  await expect(page.getByText("판매 기록이 저장되었습니다")).toBeVisible();

  await page.goto("/profitability");
  await page.getByLabel("기준 날짜").fill("2026-09-19");
  await page.getByLabel("메뉴 검색").fill("카페라떼");
  await expect(page.getByText("카페라떼").first()).toBeVisible();

  await page.goto("/expenses");
  await page.getByRole("button", { name: "비용 입력" }).click();
  await page.getByLabel("날짜", { exact: true }).fill("2026-09-19");
  await page.locator("form select").selectOption({ label: "광고비" });
  await page.getByLabel("VAT 제외 금액").fill("12345");
  await page.locator("form").getByRole("button", { name: "저장" }).click();
  await expect(page.getByText("비용 기록이 저장되었습니다")).toBeVisible();

  await page.goto("/inventory/new");
  await page.waitForTimeout(1000);
  await page.getByLabel("날짜").fill("2026-09-19");
  await page.locator("form select").nth(1).selectOption("I01");
  await page.locator("form input[type=number]").first().fill("1000");
  await page.locator("form").getByRole("button", { name: "저장" }).click();
  await expect(page.getByText("재고 기록이 저장되었습니다")).toBeVisible();

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "운영 현황" })).toBeVisible();
  await expect(page.getByText("영업손익", { exact: true })).toBeVisible();
  await expect(page.getByText("부족 재료", { exact: true }).first()).toBeVisible();
});
