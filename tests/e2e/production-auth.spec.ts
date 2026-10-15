import { expect, test } from "@playwright/test";

test("처음 방문한 사용자는 로그인 화면을 먼저 본다", async ({ browser }) => {
  const productionUrl = process.env.PRODUCTION_AUTH_TEST_URL;
  test.skip(!productionUrl, "운영 홈페이지 주소가 있을 때만 실행합니다.");

  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(productionUrl!);

  await expect(page.getByRole("heading", { name: "매장 운영자료 로그인" })).toBeVisible();
  await expect(page.getByText("승인된 계정만 판매·원가·재고·비용 자료를 함께 사용할 수 있습니다.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "운영 대시보드" })).not.toBeVisible();
  await context.close();
});
