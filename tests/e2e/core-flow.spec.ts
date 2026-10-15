import { expect, test } from "@playwright/test";

test("빈 매장에서 품목을 만들고 700ml 3병을 입고한다", async ({ page }) => {
  await page.goto("/inventory/items");
  await page.getByRole("button", { name: /첫 품목 만들기|새 품목/ }).first().click();
  await page.getByLabel("품목 이름").fill("테스트 진");
  await page.getByLabel("브랜드").fill("POCO TEST");
  await page.getByLabel("분류").selectOption("주류");
  await page.getByLabel("기준 단위").selectOption("ml");
  await page.getByLabel("포장 용량").fill("700");
  await page.getByLabel("보관 위치").fill("백바 A");
  await page.getByRole("button", { name: "저장" }).click();
  await expect(page.getByText("테스트 진 품목을 추가했습니다.")).toBeVisible();

  await page.goto("/inventory/new");
  await page.getByLabel("입력 방식").selectOption("구매 포장");
  await page.getByLabel("구매 포장 수").fill("3");
  await expect(page.getByText(/3포장 → 기준 수량 2,100ml/)).toBeVisible();
  await page.getByRole("button", { name: "저장" }).click();
  await expect(page.getByText("재고 기록을 저장했습니다.")).toBeVisible();
  await expect(page.getByText("2,100ml", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("미입력", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "재고 기록" }).click();
  await page.getByLabel("기록 유형").selectOption("폐기");
  await page.getByLabel("수량").fill("9999");
  await page.getByLabel("폐기 사유").selectOption("파손");
  await expect(page.getByRole("button", { name: "저장" })).toBeDisabled();
  await expect(page.getByText("재고가 음수가 되어 저장할 수 없습니다")).toBeVisible();
});
