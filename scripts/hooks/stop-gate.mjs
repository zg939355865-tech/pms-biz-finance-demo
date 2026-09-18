// Stop：回合结束门禁
// 1) 改了 schemas/pages/ 但还没跑 verify:page → 拦截一次，强制补验证（每个修改周期只拦一次）
// 2) 把本次会话的活动度量追加到 .tmp/hook-metrics/cost.csv（任务成本基线数据）
import fs from 'node:fs';
import path from 'node:path';
import { readStdin, inThisProject, allow, block, loadState, saveState, projectRoot } from './lib/state.mjs';

const payload = await readStdin();
if (!inThisProject(payload.cwd)) allow();

const sessionId = payload.session_id;
const state = loadState(sessionId);

// 度量记录（先记，再判断门禁，保证被拦截的回合也有数据）
try {
  const metricsDir = path.join(projectRoot, '.tmp', 'hook-metrics');
  fs.mkdirSync(metricsDir, { recursive: true });
  const csv = path.join(metricsDir, 'cost.csv');
  if (!fs.existsSync(csv)) {
    fs.writeFileSync(csv, 'time,session_id,title,duration_min,tool_calls,reads,edits,schema_edits,bash_calls,verify_runs\n');
  }
  const durationMin = state.startedAt ? ((Date.now() - state.startedAt) / 60000).toFixed(1) : '';
  const counts = state.counts || {};
  const totalCalls = Object.values(counts).reduce((a, b) => a + b, 0);
  const row = [
    new Date().toISOString(),
    sessionId || '',
    JSON.stringify(String(payload.session_title || '').slice(0, 50)),
    durationMin,
    totalCalls,
    counts.Read || 0,
    (counts.Edit || 0) + (counts.Write || 0),
    state.schemaEdited ? 1 : 0,
    counts.Bash || 0,
    state.verifyRan ? 1 : 0,
  ].join(',');
  fs.appendFileSync(csv, row + '\n');
} catch { /* 度量失败不阻塞 */ }

// verify:page 门禁：拦一次后放行，避免死循环
if (state.schemaEdited && !state.verifyRan && !state.stopWarned) {
  state.stopWarned = true;
  saveState(sessionId, state);
  block('本会话修改过 schemas/pages/ 但尚未运行 npm run verify:page -- <schema-path>。请先完成验证再交付；如确属无需验证的情况，请向用户说明后结束。');
}

saveState(sessionId, state);
allow();
