import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "monthly-performance.spec.ts",
  timeout: 90_000,
  use: { baseURL: "http://localhost:3102", channel: "chrome", trace: "retain-on-failure" },
  webServer: {
    command: "npm.cmd run dev -- -p 3102", cwd: process.cwd(), url: "http://localhost:3102",
    reuseExistingServer: false, timeout: 120_000,
    env: { NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "" },
  },
  reporter: "list",
});
