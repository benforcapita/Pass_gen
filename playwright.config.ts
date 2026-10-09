import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['json', { outputFile: 'verification/browser-results.json' }]],
  use: {
    baseURL: 'http://127.0.0.1:4196',
    launchOptions: { chromiumSandbox: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) },
    screenshot: 'only-on-failure',
    trace: 'off',
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'node scripts/serve.mjs',
    url: 'http://127.0.0.1:4196',
    reuseExistingServer: !process.env.CI,
  },
});
