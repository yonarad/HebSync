import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';

const AUTH_TIMEOUT_MS = 10 * 60 * 1000;
const POLL_INTERVAL_MS = 2_000;

function getBaseUrl() {
  const value = process.env.SMOKE_BASE_URL?.replace(/\/+$/, '');
  if (!value) {
    throw new Error('SMOKE_BASE_URL is required.');
  }

  const parsed = new URL(value);
  const isLocal = ['127.0.0.1', 'localhost'].includes(parsed.hostname);
  if (parsed.protocol !== 'https:' && !isLocal) {
    throw new Error('SMOKE_BASE_URL must use HTTPS unless it targets localhost.');
  }
  return value;
}

function delay(milliseconds) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

async function waitForAuthenticatedSession(context, baseURL) {
  const deadline = Date.now() + AUTH_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const response = await context.request.get(`${baseURL}/api/auth/session`, {
      failOnStatusCode: false,
    });

    if (response.status() === 200) {
      const body = await response.json().catch(() => null);
      if (body?.authenticated === true) {
        return;
      }
    }

    await delay(POLL_INTERVAL_MS);
  }

  throw new Error('Timed out waiting for an authenticated HebSync session.');
}

async function writeAppOnlyStorageState(context, baseURL, storageStatePath) {
  const state = await context.storageState();
  const appUrl = new URL(baseURL);
  const appHostname = appUrl.hostname.toLowerCase();
  const appOrigin = appUrl.origin;
  const appOnlyState = {
    cookies: state.cookies.filter(
      (cookie) => cookie.domain.replace(/^\./, '').toLowerCase() === appHostname,
    ),
    origins: state.origins.filter((origin) => origin.origin === appOrigin),
  };

  if (appOnlyState.cookies.length === 0) {
    throw new Error('HebSync authenticated successfully but no app session cookie was captured.');
  }

  await writeFile(storageStatePath, JSON.stringify(appOnlyState), {
    encoding: 'utf8',
    mode: 0o600,
  });
}

function runPlaywright(storageState, baseURL) {
  const cliPath = resolve('node_modules', '@playwright', 'test', 'cli.js');
  const child = spawn(
    process.execPath,
    [cliPath, 'test', '--config=playwright.authenticated-smoke.config.ts'],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        AUTHENTICATED_SMOKE_STORAGE_STATE: storageState,
        SMOKE_BASE_URL: baseURL,
      },
      stdio: 'inherit',
    },
  );

  return new Promise((resolveRun, rejectRun) => {
    child.on('error', rejectRun);
    child.on('exit', (code, signal) => {
      if (signal) {
        rejectRun(new Error(`Authenticated smoke tests stopped by signal ${signal}.`));
        return;
      }
      resolveRun(code ?? 1);
    });
  });
}

async function main() {
  const baseURL = getBaseUrl();
  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'hebsync-auth-smoke-'));
  const storageState = resolve(temporaryDirectory, 'storage-state.json');
  let browser;

  try {
    browser = await chromium.launch({ channel: 'chrome', headless: false });
    const context = await browser.newContext({
      locale: 'en-US',
      timezoneId: 'Asia/Jerusalem',
    });
    const page = await context.newPage();

    console.log('A temporary Chrome window is open at HebSync.');
    console.log('Complete Google sign-in there. Do not share passwords or verification codes.');
    console.log('The runner will continue automatically when HebSync reports an authenticated session.');

    await page.goto(`${baseURL}/calendar`, { waitUntil: 'domcontentloaded' });
    await waitForAuthenticatedSession(context, baseURL);
    await writeAppOnlyStorageState(context, baseURL, storageState);
    await browser.close();
    browser = undefined;

    console.log('Authenticated session captured in a temporary local file. Running smoke tests...');
    const exitCode = await runPlaywright(storageState, baseURL);
    process.exitCode = exitCode;
  } finally {
    await browser?.close().catch(() => {});
    await rm(temporaryDirectory, { recursive: true, force: true });
    console.log('Temporary authenticated browser state removed.');
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Authenticated smoke runner failed.');
  process.exitCode = 1;
});
