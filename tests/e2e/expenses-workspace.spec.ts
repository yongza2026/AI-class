import { test, expect } from "@playwright/test";
import { emptyDataset } from "../../src/lib/data/migration";

test("월별 비용 입력, 재시도, 미팅 집계, 모바일, 관리자 잠금", async ({ page }, testInfo) => {
  test.skip(testInfo.project.use.baseURL !== "http://localhost:3103", "가상 API를 사용하는 별도 비용 검사 설정에서만 실행합니다.");
  const fixture = emptyDataset("2027-06-30");
  fixture.expenses = [{ expenseId: "prior-rent", date: "2027-05-01", category: "임차료", amount: 3000000, recognition: "직접 입력" }];
  fixture.monthlyExpensePlan = [{ month: "2027-06", category: "임차료", amount: 3200000 }];
  const user = { id: "00000000-0000-0000-0000-000000000001", aud: "authenticated", role: "authenticated", email: "owner@poco.test", app_metadata: {}, user_metadata: {}, created_at: "2027-01-01T00:00:00Z" };
  const token = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url") + "." + Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now()/1000)+3600 })).toString("base64url") + ".test";
  let role = "owner";
  let loseResponse = true;
  let writeCalls = 0;
  const remoteRecords = Object.entries(fixture).filter(([key]) => key !== "meta").flatMap(([collection, rows]) => (rows as Record<string, unknown>[]).map(payload => ({ collection, payload, record_key: String(payload.expenseId || "") })));
  await page.route("https://expense-test.supabase.co/**", async route => {
    const request = route.request();
    const url = new URL(request.url());
    let body: unknown;
    if (url.pathname.endsWith("/token")) body = { access_token: token, refresh_token: "test-refresh", token_type: "bearer", expires_in: 3600, user };
    else if (url.pathname.endsWith("/user")) body = user;
    else if (url.pathname.endsWith("/store_members")) body = { store_id: "test-store", role, stores: { name: "POCO 검사" } };
    else if (url.pathname.endsWith("/store_datasets")) body = { meta: fixture.meta };
    else if (url.pathname.endsWith("/expense_lock_status")) body = { configured: true, lockedUntil: null };
    else if (url.pathname.endsWith("/verify_expense_lock_password")) body = true;
    else if (url.pathname.endsWith("/store_records") && request.method() === "GET") body = remoteRecords;
    else if (url.pathname.endsWith("/store_records") && request.method() === "POST") {
      writeCalls++;
      expect(request.headers().prefer).toContain("resolution=ignore-duplicates");
      for (const row of request.postDataJSON()) {
        if (!remoteRecords.some(existing => existing.collection === row.collection && existing.record_key === row.record_key)) remoteRecords.push(row);
      }
      if (loseResponse) { loseResponse = false; await route.abort("failed"); return; }
      await route.fulfill({ status: 201, body: "", contentType: "application/json" }); return;
    } else throw new Error("Unexpected mock endpoint " + request.method() + " " + url.pathname);
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });
  await page.goto("/expenses/");
  await page.getByLabel("이메일", { exact: true }).fill("owner@poco.test");
  await page.getByLabel("비밀번호", { exact: true }).fill("test-only-password");
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(page.getByRole("heading", { name: "운영 비용 잠금 해제" })).toBeVisible();
  await page.getByLabel("관리 비밀번호", { exact: true }).fill("test-only-password");
  await page.getByRole("button", { name: "잠금 해제", exact: true }).click();
  await expect(page.getByRole("heading", { name: "운영비용", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "정기비용 불러오기" }).click();
  await expect(page.getByRole("status")).toContainText("1건을 초안");
  const rent = page.locator(".expense-entry-table tbody tr").filter({ has: page.locator('input[value="3200000"]') });
  await expect(rent).toHaveCount(1);
  await page.getByText("엑셀 여러 행 붙여넣기", { exact: true }).click();
  await page.getByLabel("엑셀 내역 붙여넣기").fill("2027-06-02\t소모품·청소비\t150,000\t소모품 구입\t검사 거래처");
  await page.getByRole("button", { name: "입력표에 추가" }).click();
  page.on("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "전체 저장", exact: true }).click();
  await expect(page.getByRole("button", { name: "같은 입력 재시도" })).toBeVisible();
  await page.getByRole("button", { name: "같은 입력 재시도" }).click();
  await expect(page.getByRole("status")).toContainText("2건을 저장했습니다.");
  expect(writeCalls).toBe(2);
  expect(remoteRecords.filter(row => row.collection === "expenses")).toHaveLength(3);
  await page.getByRole("button", { name: "월말 미팅", exact: true }).click();
  await expect(page.locator(".metric-card").filter({ hasText: "운영비용" })).toContainText("3,350,000원");
  const group = page.locator("tr").filter({ has: page.getByRole("button", { name: "임차료", exact: true }) });
  await expect(group).toContainText("3,200,000원");
  await expect(group).toContainText("3,000,000원");
  await page.getByRole("button", { name: "임차료", exact: true }).click();
  await expect(page.locator(".data-table")).toContainText("월별 일괄 입력");
  await page.getByRole("button", { name: "월별 입력", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "/tmp/poco-expenses-mobile.png", fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "월말 미팅", exact: true }).click();
  await page.screenshot({ path: "/tmp/poco-expenses-meeting.png", fullPage: true });
  await page.getByLabel("회의 공유 화면 · 비용 합계 중심").check();
  await expect(page.getByRole("heading", { name: "항목별 비용 비교" })).toHaveCount(0);
  role = "viewer";
  await page.reload();
  await expect(page.getByRole("heading", { name: "관리자 전용 화면입니다" })).toBeVisible();
});
