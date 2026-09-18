# 决策与踩坑索引

常驻索引：一行一条，只记结论不记过程。AI 按需查阅，不要全文加载进每个任务。
新增条目追加到对应小节末尾；同一问题不重复记录，更新原条目即可。

## 执行效率

| 日期 | 问题 | 结论 | 状态 |
|------|------|------|------|
| 2026-09 | 删明细等轻微变更走了完整流程，耗时长 | 变更分级已写入 AGENTS.md；执行层由 hooks 强制（禁全读 pages HTML、禁手动分步检查） | 已落地 |
| 2026-09 | 排查时整读 200KB+ 构建产物 HTML / 10 万字符生成器源码，"读100用5" | `scripts/hooks/block-full-html-read.mjs` 物理拦截；大文件探索交子代理 | 已落地 |
| 2026-09 | 手动分步跑 prototype:build / check:all-pages，扩大检查范围 | `scripts/hooks/guard-manual-checks.mjs` 拦截，统一走 `verify:page`；公共组件变更加 `--allow-project-check` 放行 | 已落地 |
| 2026-09 | 改了 Schema 忘记验证就交付 | `scripts/hooks/stop-gate.mjs` 在回合结束门禁拦截一次 | 已落地 |
| 2026-09 | 简单执行型任务也深入思考，过度推演拖慢交付 | 任务分两类：执行型（改样式/字段/排版）直接做、简要汇报；分析型（流程梳理/方案/文档）才展开推理 | 已落地 |

## 跨会话记忆

| 日期 | 问题 | 结论 | 状态 |
|------|------|------|------|
| 2026-09 | Kimi Code 无自动记忆，跨会话重复推导相同结论 | 结论沉淀到本文件（索引制，按需取）；AGENTS.md 只放铁律保持精简；长任务用 `kimi --continue` 延续 | 已落地 |
| 2026-09 | AGENTS.md 与 CLAUDE.md 双份维护有漂移风险 | 结论：AGENTS.md 为唯一真源；CLAUDE.md 暂不动（用户决定），后续再收敛 | 待定 |

## 工具能力

| 日期 | 问题 | 结论 | 状态 |
|------|------|------|------|
| 2026-09 | Kimi Code 是否支持 hooks 强制拦截 | 支持。配置在 `~/.kimi-code/config.toml`，PreToolUse/Stop/UserPromptSubmit 可拦截（exit 2），fail-open 设计 | 已验证 |
| 2026-09 | 任务成本无度量，优化凭感觉 | Stop hook 记录每回合活动度量到 `.tmp/hook-metrics/cost.csv`，用于建立任务类型成本基线 | 已落地 |

## 流程缺口

| 日期 | 问题 | 结论 | 状态 |
|------|------|------|------|
| 2026-09 | 新页面流程缺菜单挂载步骤，交付后访问不到 | AGENTS.md 新页面流程补第 6 步菜单挂载 | 已落地 |
| 2026-09 | ESM 脚本 `import.meta.url` + `fileURLToPath` 在 Windows 中文路径下 `writeFileSync` 静默失败（脚本报告✓但文件未变） | 批量文件操作改用 `node -e`（基于 `process.cwd()`）或 CommonJS；修改后必须 `grep` 验证实际内容 | 已落地 |
