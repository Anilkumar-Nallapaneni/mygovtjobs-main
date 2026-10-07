import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'production-audit.spec.ts',
  workers: 2,
  reporter: 'list',
  outputDir: '../docs/audits/release-screenshots-2026-10-07',
  use: { ...devices['Desktop Chrome'] },
});
