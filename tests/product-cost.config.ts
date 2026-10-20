import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "product-cost-import.spec.ts",
  timeout: 90_000,
  use: { baseURL: "http://localhost:3101", channel: "chrome", trace: "retain-on-failure" },
  webServer: {
    command: "npm.cmd run dev -- -p 3101",
    cwd: process.cwd(),
    url: "http://localhost:3101",
    reuseExistingServer: false,
    timeout: 120_000,
    env: { NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "" },
  },
  reporter: "list",
});
