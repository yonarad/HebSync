import { spawn } from 'node:child_process';

const children = [];

function run(command, args) {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });

  children.push(child);
  return child;
}

function shutdown(code = 0) {
  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  }
  process.exit(code);
}

const api = run('node', ['scripts/local-api-server.mjs']);
const vite = run('npm.cmd', ['run', 'dev:vite']);

api.on('exit', (code) => {
  if (code && code !== 0) {
    shutdown(code);
  }
});

vite.on('exit', (code) => {
  shutdown(code || 0);
});

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
