import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.SMOKE_BASE_URL?.replace(/\/+$/, '');

if (!baseURL) {
  throw new Error('SMOKE_BASE_URL is required for production smoke tests.');
}

const parsedBaseURL = new URL(baseURL);
const isLocal = ['127.0.0.1', 'localhost'].includes(parsedBaseURL.hostname);

if (parsedBaseURL.protocol !== 'https:' && !isLocal) {
  throw new Error('SMOKE_BASE_URL must use HTTPS unless it targets localhost.');
}

export default defineConfig({
  testDir: './tests/smoke',
  outputDir: './test-results/smoke',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL,
    locale: 'en-US',
    timezoneId: 'Asia/Jerusalem',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1365, height: 768 },
      },
    },
  ],
});
