// PostToolUse：统计本会话工具使用情况，并标记"Schema 已修改 / verify:page 已运行"
// 状态写入 .tmp/hook-state/<session_id>.json，供 stop-gate.mjs 在回合结束时判定
import { readStdin, inThisProject, allow, loadState, saveState } from './lib/state.mjs';

const payload = await readStdin();
if (!inThisProject(payload.cwd)) allow();

const sessionId = payload.session_id;
const state = loadState(sessionId);
const tool = payload.tool_name || 'unknown';
state.counts[tool] = (state.counts[tool] || 0) + 1;

const input = payload.tool_input || {};
const filePath = String(input.path || input.file_path || '').replace(/\\/g, '/');
const command = String(input.command || '');

if ((tool === 'Edit' || tool === 'Write') && /(^|\/)schemas\/pages\//.test(filePath)) {
  state.schemaEdited = true;
  state.verifyRan = false; // 每次改 Schema 都要求重新验证
}
if (tool === 'Bash' && /npm\s+run\s+verify:page\b/.test(command)) {
  state.verifyRan = true;
}
if (tool === 'Bash' && /npm\s+run\s+menu:update\b/.test(command)) {
  state.menuUpdated = true;
}

saveState(sessionId, state);
allow();
