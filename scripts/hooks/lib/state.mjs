import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const hooksDir = path.dirname(fileURLToPath(import.meta.url));
export const projectRoot = path.resolve(hooksDir, '..', '..', '..');
const stateDir = path.join(projectRoot, '.tmp', 'hook-state');

function normalize(p) {
  return String(p || '').replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
}

// hooks 配置在用户级 config.toml，对所有项目生效；本项目的钩子只在 cwd 属于本项目时动作
export function inThisProject(cwd) {
  const root = normalize(projectRoot);
  const dir = normalize(cwd);
  return dir === root || dir.startsWith(root + '/');
}

export function readStdin() {
  return new Promise((resolve) => {
    let input = '';
    process.stdin.on('data', (chunk) => { input += chunk; });
    process.stdin.on('end', () => {
      try { resolve(JSON.parse(input)); } catch { resolve({}); }
    });
    process.stdin.on('error', () => resolve({}));
  });
}

export function statePath(sessionId) {
  return path.join(stateDir, `${String(sessionId || 'unknown').replace(/[^\w-]/g, '_')}.json`);
}

export function loadState(sessionId) {
  try {
    return JSON.parse(fs.readFileSync(statePath(sessionId), 'utf8'));
  } catch {
    return { counts: {}, schemaEdited: false, verifyRan: false, stopWarned: false };
  }
}

export function saveState(sessionId, state) {
  try {
    fs.mkdirSync(stateDir, { recursive: true });
    fs.writeFileSync(statePath(sessionId), JSON.stringify(state));
  } catch { /* fail-open：状态写不进去不阻塞任何操作 */ }
}

export function allow() { process.exit(0); }

export function block(reason) {
  console.error(reason);
  process.exit(2);
}
