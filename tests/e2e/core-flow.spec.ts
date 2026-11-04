import { expect, test } from "@playwright/test";

test("빈 매장에서 품목을 만들고 700ml 3병을 입고한다", async ({ page }) => {
  await page.goto("/inventory/items");
  await page.getByRole("button", { name: /첫 품목 만들기|새 품목/ }).first().click();
  const material = page.getByRole("dialog");
  await material.getByLabel("품목 이름").fill("테스트 진");
  await material.getByLabel("브랜드").fill("POCO TEST");
  await material.getByLabel("분류").selectOption("주류");
  await material.getByLabel("기준 단위").selectOption("ml");
  await material.getByLabel("포장 용량").fill("700");
  await material.getByLabel("보관 위치").fill("백바 A");
  await material.getByRole("button", { name: "저장" }).click();
  await expect(page.getByText("테스트 진 품목을 추가했습니다.")).toBeVisible();

  await page.goto("/inventory/new");
  await page.getByLabel("입력 방식").selectOption("구매 포장");
  await page.getByLabel("구매 포장 수").fill("3");
  await expect(page.getByText(/3포장 → 기준 수량 2,100ml/)).toBeVisible();
  await page.getByRole("button", { name: "저장" }).click();
  await expect(page.getByText("재고 기록을 저장했습니다.")).toBeVisible();
  await expect(page.getByText("2,100ml", { exact: true }).first()).toBeVisible();
  await page.goto("/inventory/history");
  await expect(page.getByText("미입력", { exact: true }).first()).toBeVisible();

  await page.goto("/inventory");
  await page.getByRole("button", { name: "재고 기록" }).click();
  await page.getByLabel("기록 유형").selectOption("폐기");
  await page.getByLabel("수량").fill("9999");
  await page.getByLabel("폐기 사유").selectOption("파손");
  await expect(page.getByRole("button", { name: "저장" })).toBeDisabled();
  await expect(page.getByText("재고가 음수가 되어 저장할 수 없습니다")).toBeVisible();

  await page.goto("/inventory");
  await page.getByRole("button", { name: /^테스트 진 / }).click();
  await page.getByRole("link", { name: "구매 정보", exact: true }).click();
  await expect(page).toHaveURL(/costs.*material=/);
  await expect(page.getByRole("heading", { name: "구매·원가", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "테스트 진 구매가격 수정" })).toBeVisible();
  await expect(page.getByText("선택한 품목의 구매 정보입니다.", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: "품목 설정에서 등록·수정" })).toBeVisible();
});

test("샘플 자료를 보더라도 공통 헤더는 POCO를 표시한다", async ({ page }) => {
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto("/data");
  await expect(page.getByRole("heading", { name: "백업과 양식" })).toBeVisible();
  await page.getByRole("button", { name: "샘플 불러오기" }).click();
  const banner = page.getByRole("banner");
  await expect(banner.getByText("POCO 오퍼레이션", { exact: true })).toBeVisible();
  await expect(banner.getByText("샘플 데이터", { exact: true })).toBeVisible();
  await expect(banner.getByText("프렙 카페", { exact: true })).toHaveCount(0);
});
