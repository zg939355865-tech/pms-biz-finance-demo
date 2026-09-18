// PreToolUse(Bash)：单页任务禁止手动分步调用项目级构建/检查命令
// 依据 AGENTS.md 执行效率规则第 4 条（统一走 verify:page 聚合命令）
// 确需运行（本次修改了公共组件/样式/运行时/菜单框架）时，在命令中加 --allow-project-check 放行
import { readStdin, inThisProject, allow, block } from './lib/state.mjs';

const payload = await readStdin();
if (!inThisProject(payload.cwd)) allow();

const command = String(payload.tool_input?.command || '');
const guarded = /npm\s+run\s+(prototype:build|check:all-pages|check:components|check:resource|check:resource-visual|prototype:all)\b/;

if (guarded.test(command) && !command.includes('--allow-project-check')) {
  const matched = command.match(guarded)[1];
  block(`单页任务请使用聚合命令 npm run verify:page -- <schema-path>，不要手动分步调用 ${matched}。\n如本次确实修改了公共组件/公共样式/公共运行时/菜单框架，请在命令末尾加 --allow-project-check 重试。`);
}
allow();
