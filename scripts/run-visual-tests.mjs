import { spawn } from 'node:child_process';

const serverUrl = 'http://127.0.0.1:3000';
const extraPlaywrightArgs = process.argv.slice(2);

function waitForExit(child) {
  return new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => resolve({ code, signal }));
  });
}

async function isServerAvailable() {
  try {
    const response = await fetch(serverUrl, { signal: AbortSignal.timeout(1_000) });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForServer(serverExit) {
  const deadline = Date.now() + 120_000;

  while (Date.now() < deadline) {
    if (await isServerAvailable()) return;

    const outcome = await Promise.race([
      serverExit.then((result) => ({ type: 'exit', result })),
      new Promise((resolve) => setTimeout(() => resolve({ type: 'retry' }), 200)),
    ]);

    if (outcome.type === 'exit') {
      throw new Error(`Vite exited before becoming ready (${outcome.result.code ?? outcome.result.signal}).`);
    }
  }

  throw new Error(`Timed out waiting for ${serverUrl}.`);
}

let viteProcess = null;
let viteExit = null;

async function stopOwnedServer() {
  if (!viteProcess || viteProcess.exitCode !== null || viteProcess.signalCode !== null) return;

  viteProcess.kill();
  await Promise.race([
    viteExit,
    new Promise((resolve) => setTimeout(resolve, 5_000)),
  ]);

  if (viteProcess.exitCode === null && viteProcess.signalCode === null) {
    viteProcess.kill('SIGKILL');
    await viteExit;
  }
}

async function main() {
  const shouldStartServer = !(await isServerAvailable());

  if (shouldStartServer) {
    viteProcess = spawn(
      process.execPath,
      ['./node_modules/vite/bin/vite.js', '--port', '3000', '--host', '127.0.0.1'],
      { stdio: 'inherit', windowsHide: true },
    );
    viteExit = waitForExit(viteProcess);
    await waitForServer(viteExit);
  }

  try {
    const playwrightProcess = spawn(
      process.execPath,
      ['./node_modules/@playwright/test/cli.js', 'test', ...extraPlaywrightArgs],
      { stdio: 'inherit', windowsHide: true },
    );
    const result = await waitForExit(playwrightProcess);

    if (result.signal) {
      process.kill(process.pid, result.signal);
      return;
    }

    process.exitCode = result.code ?? 1;
  } finally {
    await stopOwnedServer();
  }
}

main().catch(async (error) => {
  console.error(error);
  process.exitCode = 1;
  await stopOwnedServer();
});
