// PreToolUse(Read)：禁止整读 pages/**/*.html 构建产物（单文件 200KB+）
// 依据 AGENTS.md 执行效率规则第 1 条
import { readStdin, inThisProject, allow, block } from './lib/state.mjs';

const payload = await readStdin();
if (!inThisProject(payload.cwd)) allow();

const input = payload.tool_input || {};
const p = String(input.path || '').replace(/\\/g, '/');
const isPageHtml = /(^|\/)pages\/[^?]*\.html$/i.test(p);
const isPartialRead = input.line_offset != null || input.n_lines != null;

if (isPageHtml && !isPartialRead) {
  block(`禁止整读 pages/ 下的 HTML 构建产物：${p}\n请改用 Grep 定位片段，或 Read 时带 line_offset/n_lines 分段读取。`);
}
allow();
