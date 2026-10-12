import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  use: { baseURL: "http://localhost:3000", channel: "chrome", trace: "retain-on-failure" },
  webServer: { command: "npm.cmd run dev -- -p 3000", url: "http://localhost:3000", reuseExistingServer: true, timeout: 120_000 },
  reporter: "list",
});
