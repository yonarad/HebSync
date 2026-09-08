import { existsSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { chromium } from '@playwright/test';

const AUTH_TIMEOUT_MS = 30 * 60 * 1000;
const POLL_INTERVAL_MS = 2_000;
const WRITE_ACKNOWLEDGEMENT = 'temporary-event';
const WRITE_SCOPE_MODES = new Set(['app_created', 'all_events']);

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

function findChromeExecutable() {
  const candidates =
    process.platform === 'win32'
      ? [
          process.env.CHROME_PATH,
          process.env.PROGRAMFILES &&
            join(process.env.PROGRAMFILES, 'Google', 'Chrome', 'Application', 'chrome.exe'),
          process.env['PROGRAMFILES(X86)'] &&
            join(process.env['PROGRAMFILES(X86)'], 'Google', 'Chrome', 'Application', 'chrome.exe'),
          process.env.LOCALAPPDATA &&
            join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe'),
        ]
      : process.platform === 'darwin'
        ? [
            process.env.CHROME_PATH,
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
          ]
        : [
            process.env.CHROME_PATH,
            '/usr/bin/google-chrome',
            '/usr/bin/google-chrome-stable',
          ];

  const executable = candidates.find((candidate) => candidate && existsSync(candidate));
  if (!executable) {
    throw new Error('Google Chrome was not found. Set CHROME_PATH to its executable.');
  }
  return executable;
}

async function getFreeLoopbackPort() {
  const server = createServer();
  await new Promise((resolveListen, rejectListen) => {
    server.once('error', rejectListen);
    server.listen(0, '127.0.0.1', resolveListen);
  });
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : null;
  await new Promise((resolveClose, rejectClose) => {
    server.close((error) => (error ? rejectClose(error) : resolveClose()));
  });
  if (!port) throw new Error('Could not reserve a local Chrome debugging port.');
  return port;
}

async function connectToRegularChrome(profileDirectory, baseURL) {
  const chromeExecutable = findChromeExecutable();
  const debuggingPort = await getFreeLoopbackPort();
  const chromeProcess = spawn(
    chromeExecutable,
    [
      `--remote-debugging-port=${debuggingPort}`,
      '--remote-debugging-address=127.0.0.1',
      `--user-data-dir=${profileDirectory}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--new-window',
      `${baseURL}/calendar`,
    ],
    { stdio: 'ignore', windowsHide: false },
  );

  const endpoint = `http://127.0.0.1:${debuggingPort}`;
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (chromeProcess.exitCode !== null) {
      throw new Error(`Google Chrome exited before the test runner connected (${chromeProcess.exitCode}).`);
    }
    try {
      const response = await fetch(`${endpoint}/json/version`, {
        signal: AbortSignal.timeout(1_000),
      });
      if (response.ok) {
        return { browser: await chromium.connectOverCDP(endpoint), chromeProcess };
      }
    } catch {
      // Chrome has not opened its local debugging endpoint yet.
    }
    await delay(250);
  }

  chromeProcess.kill();
  throw new Error('Timed out connecting to the temporary Google Chrome profile.');
}

async function stopChrome(chromeProcess) {
  if (!chromeProcess || chromeProcess.exitCode !== null || chromeProcess.signalCode !== null) return;
  chromeProcess.kill();
  await Promise.race([
    new Promise((resolveExit) => chromeProcess.once('exit', resolveExit)),
    delay(5_000),
  ]);
  if (chromeProcess.exitCode === null && chromeProcess.signalCode === null) {
    chromeProcess.kill('SIGKILL');
  }
}

async function waitForAuthenticatedSession(context, baseURL, requireWriteAccess) {
  const deadline = Date.now() + AUTH_TIMEOUT_MS;
  let reportedReadOnlySession = false;

  while (Date.now() < deadline) {
    const response = await context.request.get(`${baseURL}/api/auth/session`, {
      failOnStatusCode: false,
    });

    if (response.status() === 200) {
      const body = await response.json().catch(() => null);
      if (body?.authenticated === true) {
        if (!requireWriteAccess || WRITE_SCOPE_MODES.has(body.user?.scopeMode)) {
          return;
        }
        if (!reportedReadOnlySession) {
          console.log(
            'HebSync is connected with read-only access. Use "Enable editing" in the open window and complete Google consent.',
          );
          reportedReadOnlySession = true;
        }
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
  const requireWriteAccess =
    process.env.AUTHENTICATED_SMOKE_MUTATION_ACK === WRITE_ACKNOWLEDGEMENT;
  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'hebsync-auth-smoke-'));
  const chromeProfileDirectory = resolve(temporaryDirectory, 'chrome-profile');
  const storageState = resolve(temporaryDirectory, 'storage-state.json');
  let browser;
  let chromeProcess;

  try {
    ({ browser, chromeProcess } = await connectToRegularChrome(chromeProfileDirectory, baseURL));
    const context = browser.contexts()[0];
    const page = context.pages()[0] || (await context.newPage());

    console.log('A regular Chrome window with a temporary profile is open at HebSync.');
    console.log('Complete Google sign-in there. Do not share passwords or verification codes.');
    console.log('The runner will continue automatically when HebSync reports an authenticated session.');
    if (requireWriteAccess) {
      console.log('This run requires editing access. If HebSync shows read-only mode, select "Enable editing".');
    }

    await page.goto(`${baseURL}/calendar`, { waitUntil: 'domcontentloaded' });
    await waitForAuthenticatedSession(context, baseURL, requireWriteAccess);
    await writeAppOnlyStorageState(context, baseURL, storageState);
    await browser.close();
    browser = undefined;
    await stopChrome(chromeProcess);
    chromeProcess = undefined;

    console.log('Authenticated session captured in a temporary local file. Running smoke tests...');
    const exitCode = await runPlaywright(storageState, baseURL);
    process.exitCode = exitCode;
  } finally {
    await browser?.close().catch(() => {});
    await stopChrome(chromeProcess);
    await rm(temporaryDirectory, {
      recursive: true,
      force: true,
      maxRetries: 8,
      retryDelay: 250,
    });
    console.log('Temporary authenticated browser state removed.');
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Authenticated smoke runner failed.');
  process.exitCode = 1;
});
