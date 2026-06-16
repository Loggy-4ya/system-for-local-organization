/**
 * @fileoverview Playwright config for Nexus browser automation tests.
 *
 * Registry: .ai/docs/testing.md — section "Agent quickstart — Playwright browser automation"
 *
 * How to run (agents):
 *   1. npm run test:browser:install          # once
 *   2. docker compose up                     # or: npm run dev
 *   3. PLAYWRIGHT_BASE_URL=http://localhost:8080 npm run test:browser:puck-mobile-panel
 * Optional: PUCK_E2E_EDIT_PATH=/your-page/edit  (default /testest/edit)
 */

import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:8080";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "puck-mobile-chrome",
      use: {
        ...devices["Pixel 7"],
        hasTouch: true,
        isMobile: true,
      },
    },
  ],
});
