import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e", testMatch: "expenses-workspace.spec.ts", timeout: 90000,
  use: { baseURL: "http://localhost:3103", headless: true, viewport: { width: 1440, height: 1000 } },
  reporter: "list",
  webServer: { command: "npm run dev -- --port 3103", url: "http://localhost:3103", reuseExistingServer: true, timeout: 120000, env: { NEXT_PUBLIC_SUPABASE_URL: "https://expense-test.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-public-key" } },
});
