// SessionStart：记录会话开始时间，供 stop-gate.mjs 计算会话时长
import { readStdin, inThisProject, allow, loadState, saveState } from './lib/state.mjs';

const payload = await readStdin();
if (!inThisProject(payload.cwd)) allow();

const state = loadState(payload.session_id);
if (!state.startedAt) state.startedAt = Date.now();
saveState(payload.session_id, state);
allow();
