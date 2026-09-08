import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.SMOKE_BASE_URL?.replace(/\/+$/, '');
const storageState = process.env.AUTHENTICATED_SMOKE_STORAGE_STATE;

if (!baseURL) {
  throw new Error('SMOKE_BASE_URL is required for authenticated production smoke tests.');
}

const parsedBaseURL = new URL(baseURL);
const isLocal = ['127.0.0.1', 'localhost'].includes(parsedBaseURL.hostname);

if (parsedBaseURL.protocol !== 'https:' && !isLocal) {
  throw new Error('SMOKE_BASE_URL must use HTTPS unless it targets localhost.');
}

if (!storageState || !existsSync(storageState)) {
  throw new Error(
    'AUTHENTICATED_SMOKE_STORAGE_STATE must point to the temporary state created by the authenticated smoke runner.',
  );
}

export default defineConfig({
  testDir: './tests/authenticated-smoke',
  outputDir: './test-results/authenticated-smoke',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    locale: 'en-US',
    timezoneId: 'Asia/Jerusalem',
    storageState,
    trace: 'off',
    screenshot: 'off',
    video: 'off',
    viewport: { width: 1365, height: 768 },
  },
});
